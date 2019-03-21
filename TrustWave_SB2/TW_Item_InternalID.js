/**
 * TW_Item_InternalIDjs
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record'],
	function(record){
	

		function beforeSubmit(context){
			
			var nrec = context.newRecord;
	
          var sfID = nrec.getValue({fieldId: 'custitem1'});
          log.debug('what is the id ', sfID) ;
       
			    nrec.setValue({fieldId: 'externalid', 
			    				value :'dkjjek'
			    	});
			
		}
		function afterSubmit(context){
			
		}
		return{
			beforeSubmit: beforeSubmit,
			afterSubmit: afterSubmit
		};
	}
);