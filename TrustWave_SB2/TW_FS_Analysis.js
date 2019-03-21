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
    'N/file',
    'N/format'
], function (search, record, error, runtime, email, file,format) {

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
        var recipients = 'russell.fulling@trustwave.com';
        var subject = 'Revenue Commit Script  ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
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
            var msg = 'Failure to apply payment from Payment id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
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
            log.debug('Summary ', contents);
            return true;
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
    	//get all accounting periods
    	var customrecord284SearchObj = search.create({
    		   type: "customrecord284",
    		   filters:
    		   [
    		      ["custrecord_tw_rs_trans_type","anyof","7"],
    		    //  "AND",
    		    //  ["custrecordts_fs_crm_id" ,"is", "AHMA-I2PWTV"]
    		    //  "AND", 
    		    //  ["internalidnumber","equalto","13711"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({
    		         name: "scriptid",
    		         sort: search.Sort.ASC,
    		         label: "Script ID"
    		      }),
    		      search.createColumn({name: "custrecordts_fs_crm_id", label: "Contract ID"}),
    		      search.createColumn({name: "custrecord_tw_fs_transaction_id", label: "Transaction ID"}),
    		      search.createColumn({name: "custrecord_tw_rs_trans_type", label: "Transaction Type"}),
    		     ]
    		});
    		//var searchResultCount = customrecord284SearchObj.runPaged().count;
    		//log.debug("customrecord284SearchObj result count",searchResultCount);
    		//customrecord284SearchObj.run().each(function(result){
    		   // .run().each has a limit of 4,000 results
    		  // return true;
    	//	});
    
    	return customrecord284SearchObj;
     }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	
    	var searchResult = JSON.parse(context.value);
    	var invId  = searchResult.values.custrecord_tw_fs_transaction_id.value;
    	var crmId = searchResult.values.custrecordts_fs_crm_id;
    	//var crmId2 = searchResult.values.custrecord_tw_fs_unique_w
         
    	log.debug('crmId ', crmId);
    	//log.debug('crmId ', crmId);
        //log.debug('crmId2 ', crmId2);
         
    	getGlForInvoice(context.key,invId)
   // updateCustRec(crmId,context.key);
      //createNewCR(crmId);
    	//addPayments(context.key,crmId,invId);
    //	var custRec = record.delete({
    	//       type: 'customrecord284',
    	  //    id: context.key,
    	  //  });
    	    
        
    //	context.write({
    //		    key: searchResult.id,
    //            value :  {'crmId' : crmId ,'crmId2': crmId2,  'soid':soId }
    //    	});
    
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	
    	var myV = context.values[0];
       	myV =myV.replace(/>/g, '&' + 'gt;');    	
        myV =JSON.parse(myV);
       	
     //   log.debug('CustRecId ', myV)
    	
    	var crmId  = myV['crmId'];
    	var crmId2 = myV['crmId2'];
    	var soId   = myV['soid'];
    	
        // log.debug('here is the SOID ', context.key);

     	//log.debug('soId ', soId);
     	//log.debug('crmId ', crmId);
      	//log.debug('crmId2 ', crmId2);
   		    	
    	//updateCustRec(crmId,context.key);
         //createNewCR(crmId,crmId2,soId);
    }

    function updateCustRec(crmId, custId){
    	//log.debug('process ac period ', acPeriod);
    	var salesorderSearchObj = search.create({
    		   type: "Transaction",
    		   filters:
    		   [
    			   ["type","anyof","CustCred","CustInvc","RtnAuth","SalesOrd"],
    		      "AND", 
    		      ["mainline","is","T"], 
    		      "AND", 
    		      ["custbody_crm_contract_id","is",crmId]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "mainline", label: "*"}),
    		      search.createColumn({
    		         name: "trandate",
    		         sort: search.Sort.ASC,
    		         label: "Date"
    		      }),
    		      search.createColumn({name: "internalid", label: "Internal ID"}),
    		      search.createColumn({name: "amount", label: "amount"}),
    		      search.createColumn({name: "type", label: "type"}),
    		   ]
    		});
    		var searchResultCount = salesorderSearchObj.runPaged().count;
    		//log.debug("salesorderSearchObj result count",searchResultCount);
    		
    		
    		salesorderSearchObj.run().each(function(result){
    		    //here submit the field with the soId	
    			var id = record.submitFields({
    			    type: 'customrecord284',
    			    id: custId,
    			    values: {
    			    	custrecord_tw_fs_transaction_id: result.getValue({name: 'internalid'}),
    			    	custrecord_tw_rs_tran_amount:result.getValue({name: 'amount'}),
    			    },
    			    options: {
    			        enableSourcing: false,
    			        ignoreMandatoryFields : true
    			    }
    			});
       		});
        }
    
    function getGlForInvoice( fsInternalId,invId ){
    	var transactionSearchObj = search.create({
    		   type: "transaction",
    		   filters:
    		   [
    		      ["internalidnumber","equalto",invId], 
    		      "AND", 
    		      ["mainline","is","F"], 
    		      "AND", 
    		      ["taxline","is","F"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "account", label: "Account"}),
    		      search.createColumn({name: "custbody_crm_contract_id", label: "CRM contract ID"})
    		   ]
    		});
    		var searchResultCount = transactionSearchObj.runPaged().count;
    		log.debug("transactionSearchObj result count",searchResultCount);
    		transactionSearchObj.run().each(function(result){
    			 var objRecord =  record.submitFields({
    				    type: 'customrecord284',
    				    id: fsInternalId,
    				    values: {
    				    	custrecord_tw_fs_gl_deferred: result.getValue({name: 'account'})
    				    },
    				    options: {
    				        enableSourcing: false,
    				        ignoreMandatoryFields : true
    				    }
    				});
     	  	    //log.debug("tran id ", result.getValue({name: 'tranid'}));
     		 
    		
    		   return true;
    		});
    }
      
      function createNewCR(crmId){
    	
    	  var salesorderSearchObj = search.create({
   		   type: "Transaction",
   		   filters:
   		     [
   			   ["type","anyof","CustCred","CustInvc","RtnAuth","SalesOrd"],
   		      "AND", 
   		       ["mainline","is","T"], 
   		       "AND", 
   		       ["custbody_crm_contract_id","is",crmId]
   		   ],
   		   columns:
   		   [
   		      search.createColumn({name: "mainline", label: "*"}),
   		      search.createColumn({
   		         name: "trandate",
   		         sort: search.Sort.ASC,
   		         label: "Date"
   		      }),
   		      search.createColumn({name: "internalid", label: "Internal ID"}),
   		      search.createColumn({name: "amount", label: "amount"}),
   		      search.createColumn({name: "type", label: "type"}),
   		       search.createColumn({name: "tranid", label: "tranid"}),
   		    search.createColumn({name: "trandate", label: "trdate"}),
   		   ]
   		});
    	  
    	  var searchResultCount = salesorderSearchObj.runPaged().count;
    	  log.debug("transactionSearchObj result count",searchResultCount);
    	  salesorderSearchObj.run().each(function(result){
  		    //here submit the field with the soId	
    		  var objRecord = record.create({type: 'customrecord284',isDynamic: true});
    	  	    //log.debug("tran id ", result.getValue({name: 'tranid'}));
    		  objRecord.setValue({fieldId: 'externalid',value: result.getValue({name: 'tranid'})});
    		  objRecord.setValue({fieldId: 'custrecord_tw_fs_transaction_id',value: result.getValue({name: 'internalid'})});
    	  	  
    	  	  objRecord.setValue({fieldId:'custrecordts_fs_crm_id',value: crmId});
    	  	  objRecord.setValue({fieldId:'custrecord_tw_rs_tran_amount',value: result.getValue({name: 'amount'})});
    	  	  objRecord.setValue({fieldId:'custrecord_tw_fs_transaction_date',value: result.getValue({name: 'trandate'})});
    	  	  //objRecord.setValue({fieldId:'custrecord_tw_rs_trans_type',value: result.getValue({name: 'type'})});
    	          
				    	  	var recordId = objRecord.save({
				                enableSourcing: false,
				                ignoreMandatoryFields: false
				            });
    	  	 return true;
     		});
     			
      }
    	  
    function addTransactions(cust_rec_id,transType, transId,crmId,crmId2,transAmt,soId){
    	
    	    	var objRecord = record.create({type: 'customrecord284', isDynamic: true});
		    	    
		    	    objRecord.setValue({fieldId: 'custrecord_tw_fs_transaction_id', value: transId}),
		    	    objRecord.setValue({fieldId: 'externalid',value: transId+cust_rec_id}),
		    	  // objRecord.setValue({fieldId: 'custrecord_ts_fs_so_id',value: soId}),
		            objRecord.setValue({fieldId:'custrecordts_fs_crm_id',value: crmId}),
		    	    //objRecord.setValue({fieldId:'custrecord_tw_fs_unique_w',value: crmId2}),
		    	    objRecord.setValue({fieldId:'custrecord_tw_rs_tran_amount',value: transAmt})
		    	   
		    	    var recordId = objRecord.save({
		                enableSourcing: false,
		                ignoreMandatoryFields: false
		            });
    	
    }
    
function addPayments(cust_rec_id,crmId,invoice_id){
    	
   // load the invoice record 
	var objRecord = record.load({
	    type: record.Type.INVOICE,
	    id: invoice_id,
	    isDynamic: true
	});
	
	var lineCount = objRecord.getLineCount({
		sublistId: 'links'
	});
	log.debug('how many ines ', lineCount);
	//log.debug('Create the record Invoice = ' , cust_rec_id +  ' -' + crmId +' - '+invoice_id);
	var paymentId='';
	var payTot ='';
	 for (var a = 0; a < lineCount; a++) {
    	var linkType = objRecord.getSublistValue({ sublistId: 'links', fieldId : 'type', line: a }); 
    	  if(linkType == 'Payment'){
    		  paymentId=parseInt(objRecord.getSublistValue({sublistId: 'links' , fieldId : 'id', line : a}));
    		  payTot=objRecord.getSublistValue({sublistId : 'links' , fieldId : 'total',line: a})
    		  log.debug('Payment ID = ', paymentId);
    		  log.debug('Payment total = ', payTot);
    		  
    		  addTransactions(cust_rec_id,linkType, paymentId, crmId,null ,payTot,null);
    			
    		  //var objRecord = record.create({type : 'customrecord284', isDynamic: true});
    			//   objRecord.setValue({fieldId: 'custrecord_tw_fs_transaction_id' , value : parseInt(paymentId) });
    			//   objRecord.setValue({fieldId: 'custrecord_tw_rs_trans_type', value : objRecord.getSublistValue({sublistId : 'links' , fieldId : 'type', line: a})});
    			 //  objRecord.setValue({ fieldId: 'custrecord_tw_rs_tran_amount', value :payTot });
    			 
    		//var recordId = objRecord.save({
		      //  enableSourcing: false,
		      //  ignoreMandatoryFields: false
		     //   });
    			  
    	  }
    	
	 }
 
    	
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
     //   reduce: reduce,
        summarize: summarize
    };

});
