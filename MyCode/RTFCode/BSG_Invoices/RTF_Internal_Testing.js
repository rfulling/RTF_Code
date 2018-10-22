/**
 * bsg_invoice_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_invoice_config.json
 */
define(['N/record', 'N/search', 'N/runtime', '../BSG_Library_Modules/bsg_module_core.js','moment'],
	function(record, search, runtime, bsgCore, moment){
		function beforeLoad(context){}
 
		function afterSubmit(context){
			if(context.type == 'delete'){
				return false;
			}
			var nrec = context.newRecord;
			//n ew comment on this.
			
			//if this is internal billing create  a credit memo
			var invInternal =parseInt(nrec.getValue({fieldId:'entity'}));
		     log.debug('invoice status ', nrec.getValue({fieldId:'status'}));
	      //internalBill= returnEntityMatch(invInternal		
		  if (returnEntityMatch(invInternal) && nrec.getValue({fieldId: 'status'})=='Open'){
			//create a new Credit memo from this invoice
		    //set the Cm sales rep to null and save 
	          log.debug('created CM for ', nrec.id)
			  var objRecord = record.transform({
	        	   fromType: record.Type.INVOICE,
	        	   fromId: nrec.id,
	        	   toType: record.Type.CREDIT_MEMO,
	        	   isDynamic: true,
	           	
	           });
	           objRecord.setValue({
	        	   fieldId: 'salesrep',
	        	   value : null});
	               objRecord.save();	
			}
			
				
		}
		//rf function to determine if internal billing
		function returnEntityMatch(entityID) {

		    var JSONEntity = parseInt((0), 10);
		    var retObj = [];
		    var rentalLocJSON = [];
		    var actSetting = record.load({
		    	type : 'customrecord_bsg_account_settings',
		    	id : 1
		    });
		    var nrec = 
		    rentalLocJSON = actSetting.getValue({fieldId: 'custrecord_bsg_rented_location_data'});
		    log.debug('what is the entity passed ', entityID);
		    log.debug('what is the JSON on the account setting ', rentalLocJSON);
            var isInternal = false;
		    if (!(rentalLocJSON instanceof Array)) {
		             rentalLocJSON = JSON.parse(rentalLocJSON);
		    }

		    //Here loop through the JSON for the location id 
		    for (var i = 0; i < rentalLocJSON.length; i++) {

		        if (rentalLocJSON[i].customer_ref == entityID) {
		            //the location was found set th JSONEntity to the rented_location 
		        	isInternal=true;
		          	break;
		        }
               
		    }

		    return isInternal;
		}
		
		
		
		
		function calculateEndDateFromTerm(startDate, term) {}
		
		return{
		//	beforeLoad: beforeLoad,
			afterSubmit: afterSubmit
		};
	}
);