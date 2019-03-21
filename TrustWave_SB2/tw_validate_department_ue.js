/**
 * bsg_ship_to_address_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_transaction_config.json
 */
define(['N/record', 'N/search'],
	function(record, search ){
		function beforeSubmit(context){
			var form = context.form;
			var nrec = context.newRecord;
			var curScript = runtime.getCurrentScript();
			var settings = accountSettings.getSettings();

			if(context.type != 'view'){
				// var shipToSelect = form.getField({id:'custrecord_bsg_eqr_ship_to_address'});
				var departmentID =nrec.getValue({fieldId:'department'})
				
				
			    }
				//Swap Out Primary Contact Field For Custom Field To Limit Selection
				if(context.type == 'edit' || context.type == 'create'){
					var departmentID =nrec.getValue({fieldId:'department'});
					var classId =nrec.getValue({fieldId:'class'});
			        
					switch (departmentID) {
		            //upon clicking the 'Search Item(s)' button
		             case 'finance':
		                //check all classes for finance 
		            	 var form = page_getItems(request);
		                response.writePage(form);
		                break;
		                //upon submitting
		            case 'PROCESS':
		                var form = doAddItems(request);
		                response.writePage(form);
		                break;
		                //upon loading
		            default:
		                var form = page_startSearch(request);
		                response.writePage(form);
		                break;
		        }
					
					
					
				}
			
		}

		return{
			beforeSubmit: beforeSubmit
		};
	}
);