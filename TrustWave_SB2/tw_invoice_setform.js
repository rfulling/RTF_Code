/**
 * tw_invoice_setform
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search'],
	function(record, search){
		
	function beforeLoad(context){
		
	}
	
	
	function beforeSubmit(context){
		//determine the subsidiary and the supressed indicator
		var newRecord = context.newRecord
		var isSupressed = newRecord.getValue({fieldId: 'custbody_suppressed_invoice'});
        var legalEntity = newRecord.getValue({fieldId: 'subsidiary'});
		var customForm ='91';
        //for Supressed invoices
        
		if (isSupressed){
		
		log.debug('is this supressed ', isSupressed);
		log.debug('legal Entity ', legalEntity);
		
				 switch (legalEntity) {
				         case 40 :
				        	 customForm = '207' ; 
				             break;
				         case 1 :
				        	 customForm = '112' ;
				         case 25 :
				        	 customForm = '72' ;
				             break ;
				         default :
				        	 customForm = '107' ;
				         break;
				 	}
		}
		
		if (!isSupressed){
			log.debug('is this Not supressed  ', isSupressed);
			log.debug('legal Entity ', legalEntity);
			
					 switch (legalEntity) {
					         case 40 :
					        	 customForm = '200' ; 
					             break;
					         case 1 :
					        	 customForm = '107' ;
					         case 25 :
					        	 customForm = '169' ;
					             break ;
					         default :
					        	 customForm = '72' ;
					         break;
					 	}
			}
		log.debug("set form to ", customForm);
		newRecord.setValue({fieldId : 'customform',value: customForm});
		
	}
		function afterSubmit(context){
			
			
			
		}
		return{
			beforeLoad: beforeLoad,
			afterSubmit: afterSubmit,
			beforeSubmit:beforeSubmit
		};
	}
);