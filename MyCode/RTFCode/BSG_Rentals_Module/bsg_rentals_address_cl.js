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
      
         switch(scriptContext.fieldId){
           case 'entity':
              log.debug('here ', scriptContext.fieldId);
             curRec.setValue({
					fieldId:'custbody_bsg_asset_assigned_customer',
					value:curRec.getValue({fieldId: 'entity' })
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
