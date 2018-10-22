/**
 * bsg_quote_cs.js
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

/*RF 9-14-2018 to update the asset customer on field change of the entity
 * 
 */
define(['N/search'],
	function(search) {
		function fieldChanged(context){
          
          log.debug('which field Changed ',context.fieldId );
			var curRec = context.currentRecord;
			switch(context.fieldId){
				case 'custpage_bsg_primary_contact':
					curRec.setValue({fieldId:'custbody_bsg_primary_contact',
						value:curRec.getValue({fieldId:'custpage_bsg_primary_contact'
						})});
					break;
				case 'entity':
					//Populate The Custom Select Of Contacts
					var curEntity = curRec.getValue({fieldId:'entity'});
					curRec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',
						value:curRec.getValue({fieldId:'entity'}),
						ignoreFieldChange:true		
					});
					
					log.debug('what is the entity ',  curEntity);
					
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
					
					//RF to populate the custom address picker  for assent assigned customer
					
					curRec.setValue({
						fieldId:'custpage_ship_to_address',
						value:addressLib.getAddressText({
							customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							selectedAddress: curRec.getValue({fieldId:'custpage_asset_location_address'}),
						})
					});
					break;
				case 'custpage_ship_to_address':
					curRec.setValue({
						fieldId:'shipaddress',
						value:addressLib.getAddressText({
							customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'}),
						})
					});
					
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
						
						shipToAddressField.isMandatory = true;
						
						curRec.setValue({
							fieldId:'shipaddress',
							value:addressLib.getAddressText({
								customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
								selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'}),
							})
						});
					}
					break;
				default:
					break;
			}
		}
		return {
			fieldChanged: fieldChanged
		};
	}
);