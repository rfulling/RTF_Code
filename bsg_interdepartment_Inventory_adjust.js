/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        12 Dec 2017     Rfulling
 *
 *
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/search',
    'N/record',
    'N/error',
    'N/runtime',
    'N/email',
    'N/file'
], function (search, record, error, runtime, email, file) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);   

        var author = 25154;
        var recipients = 'russell@totalwarehouse.com';
        var subject = 'Mass Update Script   ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +
            'Error code: ' + e.name + '\n' +
            'Error msg: ' + e.message;

        email.send({
            author: author,
            recipients: recipients,
            subject: subject,
            body: body
        });
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            var e = error.create({
                name: 'INPUT_STAGE_FAILED',
                message: inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            var msg = 'Failure to update Transaction id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0) {
            var e = error.create({
                name: 'RECORD_UPDATE_FAILED',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function createSummaryRecord(summary) {
        var reduceSummary = summary.reduceSummary;
        var contents = '';
        summary.output.iterator().each(function (key, value) {
            contents += (key + ' ' + value + '\n');
            log.debug('in teh each ', contents);
            //return true;
        });


        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;

        }

        catch (e) {
            handleErrorAndSendNotification(e, 'summarize');
        }
    }

    function getInputData() {
        var scriptObj = runtime.getCurrentScript();
        // log.debug("Script parameter of custscript1: " + scriptObj.getParameter({name: 'custscript_actPeriod'}));
        var arrResults = [];
        var myHeader = '';
        var arrLabel = [];

        //The first result set it the deparmental billings that so
        
        var searchToRun = 'customsearch_interdepartment_cm';
        
        // go through all the credit memo and get the sales order id 

        log.debug('mysearch ', searchToRun);

        var mySearch = search.load({ id: searchToRun });
        mySearch.run().each(function (result) {

            return true;
        });

        return mySearch;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);

     //   log.debug('here is the key ', context.key);
        context.write({
            key: context.key,
            value: searchResult.values

        });
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
        log.debug('REDUCEcontext key ', context.key);
        var cmId = parseInt(context.key);
        var curScript = runtime.getCurrentScript();
		var locationID = curScript.getParameter({name: 'custscript_bsg_location'});
	        
        var objRecord = record.load({
            type: record.Type.CREDIT_MEMO,
            id: cmId
        });
    
        var itemLocation= objRecord.getValue({fieldId: 'location'});
        var tranDate = objRecord.getValue({fieldId: 'trandate'});
        var cmLocation=parseInt(objRecord.getValue({fieldId: 'location'}));
        var entitiId=parseInt(objRecord.getValue({fieldId: 'entity'}));
        var invoiceID = parseInt(objRecord.getValue({fieldId: 'createdfrom'}));
        numLines = objRecord.getLineCount({ sublistId: 'item' });
       
       
       
        
        var transSearch = search.lookupFields({
					type: 'transaction',
					id: invoiceID,
					columns: ['createdfrom']
				});
        
        var soId = transSearch.createdfrom[0] ? transSearch.createdfrom[0].value : '';
        
        var arrIA =[];
        for (var a = 0; a < numLines; a++) {
            var itemType = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: a });
           
            log.debug('Reduce inventory type ',itemType);
            if (itemType == 'InvtPart') {
               //search for the item fulfillment.
            	var itemId = objRecord.getSublistValue({sublistId: 'item',fieldId: 'item',line: a });
            	var myqty =objRecord.getSublistValue({sublistId: 'item',fieldId: 'quantity',line: a });
                var dropShipPO = getDropShip(soId,itemId);
		                if(dropShipPO){
		                	 continue;
		                 }
            	log.debug('what is the qty ', myqty,cmId);
            	 //If the IF returns a value then create the inventory transfer here
                     if(myqty> 0){
                    	
                    	 arrIA.push({'itemId':itemId , 'cmLocation' : cmLocation ,'myqty': myqty});
                    	
                    	 // arrIA.push(tranDate);
                    	 
                    	
                   	 //transID= createIA(itemId,cmLocation,myqty,tranDate);
                     }
                //irRecord.setSublistValue({ sublistId: 'item', fieldId: 'unitcostoverride', value: parseFloat(amt), line: a });
            }
        
        }
        
        //here go through the array on the sales order 
        //if there is po it is a drop ship and does not have effect on inventory
        //Then remove it from the array.
        
        transID= createIA(arrIA,tranDate,cmId,cmLocation,entitiId);
        
        
        objRecord.setValue({
	              fieldId: 'memo',
	              value: 'Internal BillingTest'
	              });
		
		objRecord.setValue({
	        fieldId: 'custbody_bsg_internal_billing',
	        value: transID
	        });

    objRecord.save();
    }


   function getDropShip(soid,itemId){
	  log.debug('start search for full', soid + " " + itemId);
      var retAmt = [];
      
      var getCreatedFromPO = search.create({
    	  type: record.Type.SALES_ORDER,
    	  filters:  [
    	     		{
    	            name: 'internalid',
    	      		operator: 'anyof',
    	      		values: soid,
    	      		},
    	      		{
    	      	    name: 'item',
    	      	    operator: search.Operator.ANYOF,
    	      	    values: itemId,
    	      	    },
    	            {
    	            name: 'mainline',
    	            operator: search.Operator.IS,
    	            values: 'F',
    	            }
    	            ],
    	   columns: [
    		   {
    			name: 'purchaseorder'
    			}
    		   ],
      });
      
      var arrPO = getCreatedFromPO.run().getRange({start: 0,end: 10});
      var createPO = parseInt(arrPO[0].getValue('createpo'));
    
     	
      return createPO;
	}

function createIA(arrItems,tranDate,cmId,cmLocation,entitiId){
	
	
	
	
	log.debug('create adjustment ' , arrItems);
	var curScript = runtime.getCurrentScript();
	var glAccount = curScript.getParameter({name:'custscript_bsg_internal_gl_account'});
	var prdCat = curScript.getParameter({name:'custscript_bsg_internal_prod_cat'});
	
	
	try{
			var itemAdjust= record.create({
				  type: record.Type.INVENTORY_ADJUSTMENT,
		          isDynamic: true,
		          isDropShip: true
			});
			 
			
			itemAdjust.setValue({fieldId: 'subsidiary', value: 2});
			itemAdjust.setValue({fieldId: 'department', value: 1});
			itemAdjust.setValue({fieldId: 'customer', value: entitiId});
			itemAdjust.setValue({fieldId: 'class', value: prdCat});
			itemAdjust.setValue({fieldId: 'account', value: glAccount});
			itemAdjust.setValue({fieldId: 'trandate', value: tranDate});
			itemAdjust.setValue({fieldId: 'custbody_bsg_internal_billing', value: cmId});
			itemAdjust.setValue({fieldId: 'adjlocation', value: parseInt(cmLocation)});
			itemAdjust.setValue({fieldId: 'memo', value: 'Internal Billing'});
			
	
		 for (var a = 0; a < arrItems.length; a++) {
			
     		var lineNum = itemAdjust.selectNewLine({
			    sublistId: 'inventory'
			});
		
     		log.debug('what is the item ',arrItems[a].itemId)
     		
			itemAdjust.setCurrentSublistValue({sublistId:'inventory', fieldId: 'item', value: arrItems[a].itemId});
			itemAdjust.setCurrentSublistValue({sublistId:'inventory', fieldId: 'adjustqtyby', value: (parseInt(arrItems[a].myqty)*-1)});
			itemAdjust.setCurrentSublistValue({sublistId:'inventory', fieldId: 'location', value: arrItems[a].cmLocation});
			itemAdjust.setCurrentSublistValue({sublistId:'inventory', fieldId: 'department', value: 1});
			itemAdjust.setCurrentSublistValue({sublistId:'inventory', fieldId: 'class', value: prdCat});
	
	
			itemAdjust.commitLine({
			    sublistId: 'inventory'
			});
        }

	var transID= itemAdjust.save();
	   

	}catch(e){
		
		log.error({title:'FAILED TO Create Adjustment', details:e.message});
		
	}
	return transID;
}


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        handleErrorIfAny(summary);
        createSummaryRecord(summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
