/**
 * bsg_ship_to_address_cs.js
 * @NApiVersion 2.x
 * @NScriptType clientscript
 * @NAmdConfig ./bsg_transaction_config.json
 */
define(['N/record', 'N/search', 'addressLib'],
	function(record, search, addressLib){
		function pageInit(context){
			var curRec = context.currentRecord;
			if(curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}) && curRec.getValue({fieldId:'custpage_ship_to_address'})){
				curRec.setValue({fieldId:'shipaddress',
					value: addressLib.getAddressText({
						customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
						selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'})
					})
				});
			}
		}

		function validateField(context){
			var curRec = context.currentRecord;
			switch(context.fieldId){
				case 'entity':
					var curShipTo = curRec.getValue({fieldId:'shipaddress'});
					console.log('CUR SHIP',curShipTo);
					setTimeout(function(){
						//curRec.setValue({fieldId:'shipaddress',value:curShipTo})
					},400);
					break;
			}
			return true;
		}

		function fieldChanged(context){
			var curRec = context.currentRecord;

			switch(context.fieldId){
              case 'entity':
              		log.debug('here ', context.fieldId);
             		curRec.setValue({
						fieldId:'custbody_bsg_asset_assigned_customer',
						value:curRec.getValue({fieldId: 'entity' })
                       // ignoreFieldChange : true
				});
                
                             var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:curRec.getValue({fieldId:'entity'})});
                             curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value});
						     curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text,ignoreFieldChange: true});
                //if this is internal billing then change all the 
		        //change location to the assigned tech location. 
						     
						     
						     
             break;
				case 'custbody_bsg_asset_assigned_customer':
					if(curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
						var shipToAddressField = curRec.getField({fieldId:'custpage_ship_to_address'});
						var curShipToAddressId = curRec.getValue({fieldId:'custpage_ship_to_address'});
						shipToAddressField.removeSelectOption({value:null});
						shipToAddressField.insertSelectOption({value:' ',text:' '});
						
                        shipToAddressField = addressLib.populateAddressBook({
							customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							scriptType: 'ClientScript',
							field: shipToAddressField,
							defaultValue: curShipToAddressId
						});
						var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})});
                             curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value,ignoreFieldChange : true});
						     curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text,ignoreFieldChange: true});
                      
                      
                      var custSearch = search.lookupFields({
							type: 'customer',
							id: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							columns: ['custentity_bsg_primary_contact','custentity_bsg_preferred_tech']
						});
						if(custSearch.custentity_bsg_primary_contact.length){
							curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:custSearch.custentity_bsg_primary_contact[0].value});
						}
						populatePrimaryContactOptions(context);
					}
					break;
				case 'custpage_ship_to_address':
					curRec.setValue({
						fieldId:'shipaddress',
						value:addressLib.getAddressText({
							customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'}),
						})
					});
                
             
					break;
				case 'custpage_bsg_primary_contact':
					curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:curRec.getValue({fieldId:'custpage_bsg_primary_contact'})});
					break;
				default:
					break;
			}

		}

		function populatePrimaryContactOptions(context){
			var curRec = context.currentRecord;
			var curEntity = curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'});

			if(curEntity){
				var custPrimaryContactField = curRec.getField({fieldId:'custpage_bsg_primary_contact'});
				var curPrimary = curRec.getValue({fieldId:'custbody_bsg_primary_contact'});
				custPrimaryContactField.removeSelectOption({value:null});

				var entityParent = search.lookupFields({
					type: 'customer',
					id: curEntity,
					columns: ['parent']
				});

				var filters = [];
				filters.push(['isinactive','is','F']);
				filters.push('and');

				var tFilter = [];
				tFilter.push(['company','is',curEntity]);
				if(entityParent && entityParent.parent.length){
					tFilter.push('or');
					tFilter.push(['company','is',entityParent.parent[0].value]);
				}
				tFilter.push('or');
				tFilter.push(['customer.parent','is',curEntity]);

				filters.push(tFilter);

				var contactSearch = search.create({
					type: 'contact',
					filters: filters,
					columns: ['entityid']
				});
				var contactRes = contactSearch.run().getRange.promise({start:0,end:100}).then(function(resp){
					custPrimaryContactField.insertSelectOption({
						value: " ",
						text: "&nbsp;",
						isSelected: true
					});
					var isSelected = false;
					for(var i = 0; i < resp.length; i++){
						isSelected = false;
						if(curPrimary && resp[i].id == curPrimary){
							isSelected = true;
						}
						custPrimaryContactField.insertSelectOption({
							value: resp[i].id,
							text: resp[i].getValue({name: 'entityid'}),
							isSelected: isSelected
						});
					}
					if (!isSelected){
						curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:curRec.getValue({fieldId:'custpage_bsg_primary_contact'})});
					}
				});
			}
		}

		return{
			pageInit: pageInit,
			fieldChanged: fieldChanged,
			validateField: validateField
		};
	}
);