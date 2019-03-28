/**
 * TW_Item_InternalIDjs
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record'],
	function(record){
	

		function beforeSubmit(context){
           if (context.type !== context.UserEventType.CREATE){
                return;
           }
		   var bsNewRec=context.newRecord;
           var newExtId= bsNewRec.getValue({fieldId: 'custitem1'});
              bsNewRec.setValue({fieldId: 'externalid',value: newExtId});
          var stop ='';
           var customerRecord = context.newRecord;
            customerRecord.setValue('externalid', 'aaaaaa');
		
			
		}
		function afterSubmit(context){
          if (context.type == context.UserEventType.CREATE){
        	  return;
          }
              
                    rec = context.oldRecord;
                    newRec =context.newRecord;
                    var itemType =newRec.type
                    var extId = rec.getValue({fieldId: 'externalid'});
                    var newExtId= newRec.getValue({fieldId: 'custitem1'});
         
          if(!newExtId){
                newExtId=rec.id;
          }
          
              if (newExtId != extId)
                {
                  record.submitFields({
                  type: itemType,
                  id: rec.id,
                  values: {'externalid': newExtId}
                  });
                }
             
      		var newext = rec.getValue({fieldId: 'externalid'});
              log.debug('rec id',rec.id)
		}
		return{
			beforeSubmit: beforeSubmit,
			afterSubmit: afterSubmit
		};
	}
);