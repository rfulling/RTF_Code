/**
 * bsg_rentals_reservation_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

 define(['N/record', 'N/runtime', 'N/error'], function (record, runtime, error) {
    
    var exports = {};

    function beforeLoad (context) {
        //commented beacuse people create a PO and modify the Line itme to bypass
        if(context.request.parameters && context.request.parameters.rental_id){
				
        	   //log.debug('PO from Rental id ', context.request.parameters.rental_id);
				var nrec = context.newRecord;
				nrec.setValue({fieldId:'custbody_bsg_eqr_reservation_id',
				value: context.request.parameters.rental_id});
        }
      
        
        if ( context.type !== context.UserEventType.CREATE ) {
            return;
        }

        var sourceTransactionId = context.newRecord.getValue({
            fieldId: 'createdfrom'
        });
        
        if (sourceTransactionId) {
            return;
        }
        
        var currentUser = runtime.getCurrentUser();
        
        var employee = record.load({
            id: currentUser.id,
            type: record.Type.EMPLOYEE
        });
        
        var isPOResource = employee.getValue({
            fieldId: 'custentity_isporesource'
        });
        
        log.debug({
            title: 'TESTING',
            details: isPOResource
        });

        if ( isPOResource ) {
            return;
        }

        throw error.create({
            title: 'TW_PROCESS_VIOLATION',
            message: 'TW Not enough credentials from Employee Profile. Contact Your Admin',
          	notifyOff: true
        }).message;

        log.debug({
            title: 'END-OF-PROCEDURE',
            details: 'Procedure is done'
        });
    }

    exports.beforeLoad = beforeLoad;
    // exports.beforeSubmit = beforeSubmit;
    
    return exports;
 });