/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record','../BSG_Address_Filtering/bsg_addressfiltering_lib'],
/**
 * @param {record} record
 */
function(record,addressLib) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
    	var rec = scriptContext.newRecord;
		var form = scriptContext.form;
    	
		if (scriptContext.type == 'edit'|| scriptContext.type == 'create' ){
			var locationAddressSelect = form.addField({
				type: 'select',
				id: 'custpage_asset_location_address',
				label: 'Project Address'
			});
			locationAddressSelect.addSelectOption({
				value: ' ',
				text: ' '
			});
			form.insertField({
				field: locationAddressSelect,
				nextfield: 'custentity_proj_shipto'
			});
			
			//only mandadory if the selected storage is empty
			var addrId = rec.getValue({fieldId:'custentity_bsg_proj_selected_address'});
		
			if(!addrId){
			  locationAddressSelect.isMandatory = false;
			}
			
			if(scriptContext.type != 'create' ){
				//Get Address List From Bill To and Ship To Customers
				if(rec.getValue({fieldId:'custentity_bsg_proj_eng_customer'})){
					locationAddressSelect = addressLib.populateAddressBook({
						customerRecordId: rec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
						scriptType: 'UserEventScript',
						defaultValue: rec.getValue({fieldId:'custentity_proj_shipto'}),
						field: locationAddressSelect
					});
				}else {
					locationAddressSelect = addressLib.populateAddressBook({
						customerRecordId: rec.getValue({fieldId:'parent'}),
						scriptType: 'UserEventScript',
						defaultValue: rec.getValue({fieldId:'custentity_proj_shipto'}),
						field: locationAddressSelect
					});
				}
			}
		}

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	var rec = scriptContext.newRecord;
    	//here if ther is no sub customer default the custom field to the selected customer.
    	
    	/*if(!rec.getValue({fieldId:'custentity_bsg_proj_eng_customer'})){
	         
    		rec.setValue({fieldId:'custentity_bsg_proj_eng_customer',
	         value: rec.getValue({fieldId:'parent'})
	         })
	
         }*/
    	var nrec = scriptContext.newRecord;

		//Update  Location Address Field
		nrec.setValue({fieldId:'custentity_bsg_proj_selected_address',
			           value:nrec.getValue({fieldId:'custpage_asset_location_address'})
			         });
		
		if(nrec.getValue({fieldId:'custentity_bsg_proj_selected_address'})){
			var addressDetails = addressLib.getAddressDetail({
				customerRecordId: nrec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
				selectedAddress: nrec.getValue({fieldId:'custentity_bsg_proj_selected_address'})
			});
			log.debug({title:'ADDRESS DETAILS',details:addressDetails});
			//nrec.setValue({fieldId:'custrecord_bsg_asset_location_city',value:addressDetails.getValue({name:'city'})});
			//nrec.setValue({fieldId:'custrecord_bsg_asset_location_state',value:addressDetails.getValue({name:'state'})});
			//nrec.setValue({fieldId:'custrecord_bsg_asset_location_zip',value:addressDetails.getValue({name:'zipcode'})});

			nrec.setValue({
				fieldId:'custentity_proj_shipto',
				value:addressLib.getAddressText({
					customerRecordId: nrec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
					selectedAddress: nrec.getValue({fieldId:'custentity_bsg_proj_selected_address'})
				})
			});
		}else{
			var addressDetails = addressLib.getAddressDetail({
				customerRecordId: nrec.getValue({fieldId:'parent'}),
				selectedAddress: nrec.getValue({fieldId:'custentity_bsg_proj_selected_address'})
			});
			log.debug({title:'ADDRESS DETAILS in else',details:addressDetails});
			
			nrec.setValue({
				fieldId:'custentity_proj_shipto',
				value:addressLib.getAddressText({
					customerRecordId: nrec.getValue({fieldId:'parent'}),
					selectedAddress: nrec.getValue({fieldId:'custentity_bsg_proj_selected_address'})
				})
			});
			
		}

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
