


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
require([
    'N/search',
    'N/record',
    'N/error',
    'N/runtime',
    'N/email',
    'N/file'
    ], function (search, record, error, runtime, email, file) {
    handleErrorAndSendNotification();
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
        
           var revCommitted = record.load({ 
        	type : record.Type.REVENUE_COMMITMENT,
        	id   : 6982356,
        	isDynamic: false
        	
        });
      
       var lineCount = revCommitted.getLineCount({sublistId : 'item'});
     
       for (var x = 0; x < lineCount; x++) {
        var subLineItem=revCommitted.getSublistValue({
        	   sublistId: 'item',
        	   fieldId: 'item',
        	   line: x
           })   
       //here get the internal id of the custom record query the sales order and the item number 
           
           var arrCustRec = checkItemInArray(4101336,subLineItem);
           var cusRecInteral = arrCustRec.getValue({name : 'internalid'});
          
           record.submitFields({
        	    type: 'customrecordtw__rev_commit_automation',
        	    id: cusRecInteral,
        	    values: {
        	    	custrecord_tw_rev_rec: 6982356,
        	    },
        	    options: {
        	        enableSourcing: false,
        	        ignoreMandatoryFields : true
        	    }
        	});

       }
    //   revCommit.commitLine({ sublistId:  'item'});
   //    var rvID=revCommit.save();
	var stop ='';				 
    }
    
    function checkItemInArray(soID,subLineItem){
   	 
  	  var custRecItem = search.create({
  		   type: "customrecordtw__rev_commit_automation",
  		   filters:
  		   [
  		      ["custrecord_tw_rec_commit_automation","anyof",soID], 
  		      "AND", 
  		      ["custrecord_tw_re_commit_autu_sku","anyof",subLineItem]
  		   ],
  		   columns:
  		   [
  			  search.createColumn({name: "internalid"}),
  		      search.createColumn({name: "custrecord_tw_rec_commit_automation", label: "Sales Order"}),
  		      search.createColumn({name: "custrecordtw_rev_commit_auto_crm_id", label: "CRM ID"}),
  		      search.createColumn({name: "custrecord_tw_re_commit_autu_sku", label: "Sku Item"}),
  		      search.createColumn({name: "custrecord_tw_rev_commit_auto_qty", label: "Quanity"}),
  		      search.createColumn({name: "custrecord_tw_rev_commit_auto_amt", label: "Amount"}),
  		      search.createColumn({name: "custrecord_tw_rev_commit_auto_start", label: "Rev Rec Start"}),
  		      search.createColumn({name: "custrecord_tw_rev_commit_auto_enddate", label: "Rev Rec End"})
  		   ]
  		});
  	
  	 
  		var searchResultCount = custRecItem.runPaged().count;
  		var mysr=[];
  		if(searchResultCount>0){
  		   
  		   // log.debug("customrecordtw__rev_commit_automationSearchObj result count",searchResultCount);
  		   custRecItem.run().each(function(result){
  		   mysr=result;
  			
  		  });
  	}
   return mysr; 
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

        var searchToRun = 'customsearch1165';// runtime.getCurrentScript().getParameter({ name: 'custscript_fr_search_update_fulfillment' });

        log.debug('mysearch ', searchToRun);

        var mySearch = search.load({ id: searchToRun });

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

        log.debug('RAW Map ', searchResult);
        var recId = context.ket;
        var itemId = searchResult.values.item['value'];
        var amt = searchResult.values.amount;
        var quantity = searchResult.values.quantity;
        var soId = searchResult.values['createdfrom.createdFrom']['value'];
        var amt = parseFloat(amt / parseInt(quantity));
        var correctAmount = 0;
        log.debug('searchResult item Id  ', itemId)
        //context.write({ key: context.key });
        context.write({ key: context.key, value: itemId });

        //write all these variables to the context for use in reduce.
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
        var arrResults = [];
        var myHeader = '';
        var arrLabel = [];
        log.debug('reduce key ', context);
        var reduceJ = JSON.parse(context);
        log.debug('JSON context ', reduceJ);
        // var searchToRun = 'customsearch1165';// runtime.getCurrentScript().getParameter({ name: 'custscript_fr_search_update_fulfillment' });
        var IRSearch = 'customsearch_' + context.key;
        //here get the length of values
        log.debug('logne value ', context.values.length);


        for (var x = 1; x <= rcontext.values.lengt; x++) {
             log.debug('context item ', context.key ,+' ' + context.values)
        }

        var searchToRun = search.create({
            id: IRSearch,
            type: search.Type.ITEM_RECEIPT,
            name: 'Russell Fulling IR ' + context.key,
            title: 'Russell Fulling IR  to Delete' + context.key,
            filters:
            [
                /*
                    {
                    name: 'type',
                    operator: 'is',
                    values: 'ITEM_RECEIPT'
                },
                
                    {
                    name: 'type',
                    join: 'createdFrom',
                    operator: 'anyof',
                    values: 'RETURN_AUTHORIZATION'
                    },

                 */
                {
                    name: 'account',
                    operator: 'anyof',
                    values: [130, 300]
                },
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: context.key
                }
            ],
            columns:
            [

                {
                    name: 'createdfrom',
                    join: 'createdFrom'
                },

                { name: 'amount' },
                { name: 'item' },
                { name: 'quantity' }
            ],
        });


        //   searchToRun.save();
        var mySearchIR = search.load({ id: IRSearch });

        log.debug('REDUCE Search  ', mySearchIR);

        mySearchIR.run().each(function (result) {

            var soId = result.getValue({
                name: 'createdfrom',
                join: 'createdFrom'
            });
            var itemId = result.getValue({
                name: 'item'
            });

            var amt = result.getValue({ name: 'amount' });
            var quantity = result.getValue({ name: 'quantity' });
            log.debug('what is the IR quantity created from and item amount  ', quantity + ' ' + soId + ' ' + itemId + ' ' + amt);

            amt = parseFloat(amt / parseInt(quantity));

            var correctAmount = 0;

            var arrIFValues = getCorrectAmt(soId, itemId);

            if (!isEmpty(arrIFValues)) {
                correctAmount = arrIFValues[0].amount;
                var correctQty = arrIFValues[0].qty;
            }
            //now update the IR with the new correct amount and matching sku
            log.debug("amount to compare ", correctAmount + ' ' + correctQty);
            log.debug('Amount to be mutiplied by quantity for IR ', parseFloat(correctAmount) / parseInt(correctQty));
            log.debug('here is the soID , ITEMid and ir id ', soId + ' ' + itemId + ' ' + result.id);


            correctAmount = parseFloat(correctAmount) / parseInt(correctQty);
            correctAmount = correctAmount;  //* (quantity);


            log.debug('Correct amount  ', correctAmount + '  IR amount  ' + amt);
            //Here compare the results of the amounts.
            if (parseFloat(correctAmount) != parseFloat(amt) && !isEmpty(correctAmount)) {
                updateIR(result.id, itemId, correctAmount);
            }

            return true;
        });
        try {
            log.debug('here to delete ', 'customsearch_' + context.key);
            //  search.delete({ id: 'customsearch_' + context.key });
        } catch (e) {
            log.debug('catch Could Not Delete ', 'customsearch_' + context.key);
        }


    }


    function getCorrectAmt(soid, itemsku) {
        log.debug('start search for full', soid + " " + itemsku);

        var retAmt = [];

        var amtSearch = 'customsearch_' + soid;

        var getAmtSearch = search.create({
            id: amtSearch,
            type: search.Type.ITEM_FULFILLMENT,
            name: 'Russell Fulling',
            title: 'Russell Fulling to Delete',
            filters:
            [{
                name: 'internalid',
                join: 'createdfrom',
                operator: 'anyof',
                values: soid
            },
            {
                name: 'item',
                operator: 'anyof',
                values: itemsku
            },
            {
                name: 'account',
                operator: 'anyof',
                values: [130, 300]
            }
            ],
            columns:
            [
                { name: 'type' },
                { name: 'createdfrom' },
                { name: 'amount' },
                { name: 'item' },
                { name: 'quantity' }
            ],


        });

        // getAmtSearch.save();
        log.debug('what is in use ', getAmtSearch);

        getAmtSearch.run().each(function (result) {
            log.debug('search result ', result);
            var amtNew = result.getValue({ name: 'amount' });
            var qtyNew = result.getValue({ name: 'quantity' });
            retAmt.push({ 'amount': amtNew, 'qty': qtyNew });

            log.debug('query go amount ', amtNew);
            log.debug('delete the correct AmtSearch  ', 'customsearch_' + soid)
            //    search.delete({ id: 'customsearch_' + soid });
        });

        return retAmt;

    }

    function updateIR(irID, sku, amt) {
        log.debug('update the ir ', irID + ' ' + sku + ' ' + amt);
        var irRecord = record.load({
            type: record.Type.ITEM_RECEIPT,
            id: irID
        }),

            numLines = irRecord.getLineCount({ sublistId: 'item' });
        for (var a = 0; a < numLines; a++) {
            var checkItem = irRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: a });
            if (checkItem == sku) {
                irRecord.setSublistValue({ sublistId: 'item', fieldId: 'unitcostoverride', value: parseFloat(amt), line: a });
            }
        }
        irRecord.save();
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

    /**
 * Helper Function
 * @param {string} itemDisp condition of item being returned
 * @returns {bool} true or false based on if field is empty
 */
    function isEmpty(stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }
        else {
            if (typeof stValue == 'string') {
                if ((stValue == '')) {
                    return true;
                }
            }
            else if (typeof stValue == 'array') {
                if (stValue.length == 0 || stValue.length == 'undefined') {
                    return true;
                }
            }
            else if (typeof stValue == 'object') {
                if (stValue == null) {
                    return true;
                }
                else {

                    for (var key in stValue) {
                        if (stValue.hasOwnProperty(key)) {
                            return false;
                        }
                    }

                    return true;
                }
            }

            return false;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
