/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','../BSG_Address_Filtering/bsg_addressfiltering_lib'],
		function(record, search, addressLib){
    

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
    	var curRec = scriptContext.currentRecord;
        log.debug('here ', curRec);
      switch(scriptContext.fieldId){
			case 'custentity_bsg_proj_eng_customer':
				
				if(curRec.getValue({fieldId:'custentity_bsg_proj_eng_customer'})){
					var shipToAddressField = curRec.getField({fieldId:'custpage_asset_location_address'});
					var curShipToAddressId = curRec.getValue({fieldId:'custpage_asset_location_address'});
					shipToAddressField.removeSelectOption({value:null});
					shipToAddressField.insertSelectOption({value:' ',text:' '});
					
					shipToAddressField = addressLib.populateAddressBook({
						customerRecordId: curRec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
						scriptType: 'ClientScript',
						field: shipToAddressField,
						defaultValue: curShipToAddressId
					});
					//var custSearch = search.lookupFields({
					//	type: 'customer',
					//	id: curRec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
					//	columns: ['custentity_bsg_primary_contact','custentity_bsg_preferred_tech']
					//});
					
					//if(custSearch.custentity_bsg_primary_contact.length){
					//	curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:custSearch.custentity_bsg_primary_contact[0].value});
					//}
					//if(custSearch.custentity_bsg_preferred_tech.length){
					//	curRec.setValue({fieldId:'custbody_bsg_assigned_tech',value:custSearch.custentity_bsg_preferred_tech[0].value});
				    //}
				}
				break;
			case ' ':
				curRec.setValue({
					fieldId:'custentity_proj_shipto',
					value:addressLib.getAddressText({
						customerRecordId: curRec.getValue({fieldId:'custentity_bsg_proj_eng_customer'}),
						selectedAddress: curRec.getValue({fieldId:'custpage_asset_location_address'}),
					})
				});
				break;
			default:
				
				break;
		}
      
      
      
      
      
    }

    return {
        fieldChanged: fieldChanged,
    };
    
});
