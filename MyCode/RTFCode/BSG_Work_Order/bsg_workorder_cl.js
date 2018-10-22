/**
 * bsg_workorder_cl.js
 * @NApiVersion 2.x
 * @NScriptType clientscript
 * @NAmdConfig ./bsg_workorder_config.json
 */
define(['N/record', 'N/search', 'addressLib', './bsg_workorder_utility'],
	function(record, search, addressLib, workOrderUtility){
		function pageInit(context){
			workOrderUtility.toggleWOEquipCategory();
			var curRec = context.currentRecord;
			var svcChecklist = curRec.getValue({fieldId:'custbody_bsg_service_order_checklist'});
			if (!svcChecklist) {
				var checkListJSON = {
					checklist_images: [],
					checklist_items: []
				};
				curRec.setValue({fieldId:'custbody_bsg_service_order_checklist', value:JSON.stringify(checkListJSON)});
			}
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
		  // log.debug('entity validate field ', curRec);	
          switch(context.fieldId){
				case 'entity':
					var curShipTo = curRec.getValue({fieldId:'shipaddress'});
					console.log('CUR SHIP',curShipTo);
				//	setTimeout(function(){
					//	curRec.setValue({fieldId:'shipaddress',value:curShipTo})
				//	},400);
					break;
			}
			return true;
		}

		function fieldChanged(context){
			var curRec = context.currentRecord;

			switch(context.fieldId){
			
            /* case 'entity':
					//Populate The Custom Select Of Contacts
					var curEntity = curRec.getValue({fieldId:context.fieldId});
					curRec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',
						value:curRec.getValue({fieldId:'entity'}),
						ignoreFieldChange: true
						});
					var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:curRec.getValue({fieldId:'entity'})});

					if(defaultShippingAddress){
						log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
						curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value});
						curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text});
					}
					break;*/
					
              case 'custbody_bsg_work_order_equip_category':
					workOrderUtility.toggleWOEquipCategory();
					break;
				case 'custbody_bsg_service_kit':
					if (curRec.getValue({fieldId:'custbody_bsg_service_kit'})){
						workOrderUtility.addServiceKitItems();
					}
					break;
				case 'custbody_bsg_work_order_type':
					var workOrderType = curRec.getValue({fieldId:'custbody_bsg_work_order_type'});
					var woConfigSearch = search.create({
						type: 'customrecord_bsg_wo_config',
						filters: [['custrecord_bsg_wo_config_type','is',workOrderType]],
						columns: [
							'custrecord_bsg_wo_config_department',
							'custrecord_bsg_wo_config_class',
							'custrecord_bsg_wo_config_svc_checklist',
							'custrecord_bsg_wo_config_svc_kit',
							'custrecord_bsg_wo_config_equip_cat',
							'custrecord_bsg_wo_config_svc_from_asset'
						]
					});

					var woConfigRes = woConfigSearch.run().getRange({start:0,end:1});
					if(woConfigRes.length){
						curRec.setValue({fieldId:'department',value:woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_department'})});
						curRec.setValue({fieldId:'class',value:woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_class'})});
						curRec.setValue({fieldId:'custbody_bsg_service_kit',value:woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_svc_kit'})});
						curRec.setValue({fieldId:'custbody_bsg_work_order_equip_category',value:woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_equip_cat'})});

						//Set Service Checklist
						var svcChecklist = woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_svc_checklist'});
						if(woConfigRes[0].getValue({name:'custrecord_bsg_wo_config_svc_from_asset'})){
							if(curRec.getValue({fieldId:'custbody_bsg_asset_card'})){
								var asRec = search.lookupFields({
									type: 'customrecord_bsg_asset_card',
									id: curRec.getValue({fieldId:'custbody_bsg_asset_card'}),
									columns: 'custrecord_bsg_asset_pm_checklist'
								});
								if(asRec && asRec.custrecord_bsg_asset_pm_checklist && asRec.custrecord_bsg_asset_pm_checklist.length){
									svcChecklist = asRec.custrecord_bsg_asset_pm_checklist[0].value;
								}
							}
						}
						curRec.setValue({fieldId:'custbody_bsg_service_checklist',value:svcChecklist});
					}
					break;
				case 'custbody_bsg_service_checklist':
					if (curRec.getValue({fieldId:'custbody_bsg_service_checklist'})){
						if (curRec.getValue({fieldId:'custbody_bsg_service_order_checklist'})){
							if(!curRec.id){
								var scRec = search.lookupFields({
									type: 'customrecord_bsg_service_checklists',
									id: curRec.getValue({fieldId:'custbody_bsg_service_checklist'}),
									columns: 'custrecord_bsg_sc_json'
								});
								curRec.setValue({fieldId:'custbody_bsg_service_order_checklist',value:scRec.custrecord_bsg_sc_json});
							}else{
								if (confirm('This will overwrite the current service checklist. Would you like to continue?')){
									var scRec = search.lookupFields({
										type: 'customrecord_bsg_service_checklists',
										id: curRec.getValue({fieldId:'custbody_bsg_service_checklist'}),
										columns: 'custrecord_bsg_sc_json'
									});
									curRec.setValue({fieldId:'custbody_bsg_service_order_checklist',value:scRec.custrecord_bsg_sc_json});
									workOrderUtility.buildServiceChecklist();
								}
							}
						}
					}
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

							if(defaultShippingAddress){
								log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
								curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value});
								curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text});
							}
/*
                            var custSearch = search.lookupFields({
							type: 'customer',
							id: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							columns: ['custentity_bsg_primary_contact','custentity_bsg_preferred_tech']
						});
						if(custSearch.custentity_bsg_primary_contact.length){
							curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:custSearch.custentity_bsg_primary_contact[0].value});
						}
						if(custSearch.custentity_bsg_preferred_tech.length){
							curRec.setValue({fieldId:'custbody_bsg_assigned_tech',value:custSearch.custentity_bsg_preferred_tech[0].value});
						}*/
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
				default:
					break;
			}

		}
		
		 /**
	     * Validation function to be executed when sublist line is committed.
	     *
	     * @param {Object} scriptContext
	     * @param {Record} scriptContext.currentRecord - Current form record
	     * @param {string} scriptContext.sublistId - Sublist name
	     *
	     * @returns {boolean} Return true if sublist line is valid
	     *
	     * @since 2015.2
	     */
	    function validateLine(context) {
	    	//get the asset number from the line init 
			var curRec = context.currentRecord;
			var itemId = curRec.getCurrentSublistValue({sublistId: 'item',fieldId: 'item' });
		///	var assetId = curRec.getValue({'fieldId': 'custbody_bsg_asset_card'});
		//	log.debug('here I have item ',itemId );
			log.debug('here is the asset  ',curRec);
		

			// now get a list or child assets and insert them onthe line.
			return ;
	    }
	    
	    function lineInit(scriptContext) {
        var currIndex = curRec.getCurrentSublistIndex({
		    sublistId: 'item'
		});
	//create a new line with the child 
		curRec.insertLine({
		    sublistId: 'item',
		    line: 2	
		    });
		curRec.setCurrentSublistValue({
		    sublistId: 'item',
		    fieldId: 'item',
		    value: itemId
		   });
		curRec.setCurrentSublistValue({
		    sublistId: 'item',
		    fieldId: 'quantity',
		    value: 1,
		    ignoreFieldChange: true
		});
		
		curRec.commitLine({
		    sublistId: 'item'
		  
		   });
		
	    }
		return{
			pageInit: pageInit,
			fieldChanged: fieldChanged,
			validateField: validateField,
			validateLine : validateLine 
		};
	}
);