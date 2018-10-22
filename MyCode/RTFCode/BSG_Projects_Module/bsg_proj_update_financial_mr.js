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

        var author = -5;
        var recipients = 'rfulling@netsuite.com';
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
    	var projectSearch = search.create({
			type: 'job',
			columns: [],
			filters: []
		});

		var resStart = 0;
		var resEnd = 1000;
		var moreRes = true;
		var results = [];

		while(moreRes){
			var res = projectSearch.run().getRange({start: resStart, end: resEnd});
			if (!res || res.length < 1000){
				moreRes = false;
			}else{
				resStart = resEnd;
				resEnd += 1000;
			}
			results = results.concat(res);
		}

		return results;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);

      //  log.debug('here is the map context in JSON ', searchResult.id);
        context.write({
            key: searchResult.id,
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
       // log.debug('REDUCEcontext', context);
        var myId = parseInt(context.key);
        log.debug('REDUCE key to search ', myId);
    
        var soValue = getTransvalues(myId,'salesorder');
        var invValue= getTransvalues(myId,'invoice');
        log.debug('invoice order total ', invValue);
        log.debug('sales order total ', soValue);
       
        try {
            record.submitFields({
                type: record.Type.JOB,
                id: myId,
                values: { custentity_bsg_proj_sales_orders : soValue, custentity_bsg_proj_invoices: invValue }
            })

        } catch (e) {
            log.debug('Update note failed ', e.message);
        }
    }


function getTransvalues(projId,transType){
	  log.debug('start search for full', projId + " " + transType);
      var retAmt = [];
     
      var ifFilters = [];
      var ifColumns = [];
      
      var ifFilters = [];
      var ifColumns = [];

      var tranSearch = search.create({
          type: transType,
          filters: [
              {
                  name: 'internalid',
                  join: 'jobmain',
                  operator: search.Operator.ANYOF,
                  values: projId,
              },
              {
                  name: 'mainline',
                  operator: search.Operator.IS,
                  values: true,
              },
              {
                  name: 'status',
                  operator: search.Operator.IS,

                  values: ['CustInvc:A', 'CustInvc:D','SalesOrd:B','SalesOrd:D','SalesOrd:E','SalesOrd:F'],
              },
          ],
          columns: [
              {
                  name: 'amount',
                  summary: 'sum',
              },
          ],
      });
      			
      			var resStart = 0;
      			var resEnd = 1000;
      			var moreRes = true;
      			var results = [];

      			while(moreRes){
      				var res = tranSearch.run().getRange({start: resStart, end: resEnd});
      				if (!res || res.length < 1000){
      					moreRes = false;
      				}else{
      					resStart = resEnd;
      					resEnd += 1000;
      				}
      				results = results.concat(res);
      				 var myAmt = results[0].getValue({
      	                name: 'amount',
      	                summary: 'sum'
      	            });   
      			}

      		 log.debug({
      			title: 'transSearch results',
      		     details: JSON.stringify(results)
      			});
  
     	return myAmt;
	}

function getInvValues(projId,transType){
	  log.debug('start search for full', projId + " " + transType);
    var retAmt = [];
   
    var ifFilters = [];
    var ifColumns = [];
    
    var ifFilters = [];
    var ifColumns = [];

    var tranSearch = search.load({id: 'customsearch_bsg_proj_open_so'});
   
    ifFilters =
        search.createFilter({
            name: 'internalid',
            join: 'jobmain',
            operator: search.Operator.IS,
            values: projId
        }),
       search.createFilter({
           name: 'type',
           operator: search.Operator.ANYOF,
           values: record.Type.INVOICE
    });
    
                   
    ifColumns =
        search.createColumn({
            name: 'amount',
            summary: 'sum'

        });
        
    tranSearch.filters.push(ifFilters);
    tranSearch.columns.push(ifColumns);
    			
    			var resStart = 0;
    			var resEnd = 1000;
    			var moreRes = true;
    			var results = [];

    			while(moreRes){
    				var res = tranSearch.run().getRange({start: resStart, end: resEnd});
    				if (!res || res.length < 1000){
    					moreRes = false;
    				}else{
    					resStart = resEnd;
    					resEnd += 1000;
    				}
    				results = results.concat(res);
    				 var myAmt = results[0].getValue({
    	                name: 'amount',
    	                summary: 'sum'
    	            });   
    			}

    		 log.debug({
    			title: 'transSearch results',
    		     details: JSON.stringify(results)
    			});

   	return myAmt;
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
