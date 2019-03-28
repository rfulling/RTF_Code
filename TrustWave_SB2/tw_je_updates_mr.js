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
    	var customrecord_tw_je_updateSearchObj = search.create({
    		   type: "customrecord_tw_je_update",
    		   filters:
    		   [
    		      ["custrecord_tw_je_update_processed","is","F"],
    		    //  "AND",
    		      
    		    //  ["custrecord_tw_je_update_id","anyof","6699297"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "custrecord_tw_je_update_id", label: "Journal Entry"}),
    		      search.createColumn({name: "custrecord_tw_je_update_processed", label: "Processed"}),
    		      search.createColumn({name: "custrecord_tw_je_update_crm_id", label: "CRM_ID"}),
    		      search.createColumn({name: "custrecord_tw_je_update_line_id", label: "LineId"})
    		   ]
    		});
    	   return customrecord_tw_je_updateSearchObj;
     }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	
    	var searchResult = JSON.parse(context.value);
    	var journalId = searchResult.values.custrecord_tw_je_update_id.value;
    	var crmTextId =searchResult.values.custrecord_tw_je_update_crm_id;
    	var lineId = searchResult.values.custrecord_tw_je_update_line_id;
    	var customJeId =searchResult.id;
      
    	//log.debug('journalId ', journalId);
    	//log.debug('crmTextId ', crmTextId);
    //	log.debug('customJeId', customJeId);
    	context.write({
    		   key: customJeId,
                value : {'jeid' :journalId , 'textUp': crmTextId,'lineNumber': lineId}
        	});
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
   	
    var jeToUpdate = myV['jeid'];
    var txtToUpdate = myV['textUp'];
    var lineId = myV['lineNumber'];
    var jeIDCustom = context.key;
   	
    log.debug('here is the jeID ', myV['jeid']);
   	log.debug('here is the textUpdate ', myV['textUp']);
   	log.debug('here is the lineId ', myV['lineNumber']);
   	log.debug('here is key to update ', context.key);
    	
    //	log.debug('here is teh JE id ', context.key);
    	//log.debug('here is the crm id ',myreId);
    	    	
    	updateJE(jeToUpdate,txtToUpdate,jeIDCustom,lineId);
    }

    function updateJE(jdID,myreId,jeIDCustom,lineNumber){
    	//log.debug('process ac period ', acPeriod);
    	
    	var myJE =record.load({type: 'journalentry', id : jdID, isDynamic: false, });
    	  var lineCount = myJE.getLineCount({sublistId: 'line'});
    	  for (var x = 0; x < lineCount; x++) {
    	     var thisLine = myJE.getSublistValue({sublistId:'line',fieldId:'line',line:x});
    		  //todo only use whenlines match.
    	       if(thisLine==lineNumber){
    		  myJE.setSublistValue({sublistId: 'line',line: x, fieldId:'custcol_contract_data',value: myreId})
    	   }
    	  
    	  }
    	// myJE.commitLine({sublistId:'line'});
    	
  try{
    	 var recordId = myJE.save({
    		    enableSourcing: false,
    		    ignoreMandatoryFields: true
    		});
    	 
    	 if(recordId){
          record.submitFields({type : 'customrecord_tw_je_update',id:jeIDCustom, values : { custrecord_tw_je_update_processed :true}}); 		 
    	 }
 
  }catch (e ){
	  log.debug("error " , e.message);
	  handleErrorIfAny(e.message);
  } 
    	 
    	 
        }
      
      function createARbyPeriod(apId,startDate,endDate){
    	  log.debug('accounting perido start end ', apId +' - '+startDate + ' - '+ endDate );
    	  var transactionSearchObj = search.create({
    		   type: "transaction",
    		   filters:
    		   [
    			   ["accountingperiod.enddate","onorbefore","1/31/2018"], 
    			      "AND", 
    			      ["accounttype","anyof","AcctPay"], 
    			      "AND", 
    			      ["account","anyof","294","295","296"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({
    		         name: "subsidiary",
    		         summary: "GROUP",
    		         label: "Legal Entity"
    		      }),
    			  search.createColumn({
    		         name: "account",
    		         summary: "GROUP",
    		         label: "Account"
    		      }),
    			  
    		      search.createColumn({
    		          name: "amount",
    		          summary: "SUM",
    		          label: "Amount"
    		       }),
    		      
    		   ]
    		});
    		var searchResultCount = transactionSearchObj.runPaged().count;
    		//log.debug("transactionSearchObj result count",searchResultCount);
    		
    		
    		transactionSearchObj.run().each(function(result){
    		 var newRatio= record.create({type:'customrecord_tw_dso_ratio',isDynamic: true});
    		   // log.debug('running results ', 'Account result'+ result.getValue({name: 'account',summary: 'group'})) ;  	
    		  
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_gl_act' ,value: result.getValue({name: 'account',summary: 'group'})});
	    		    newRatio.setValue({fieldId: 'custrecord_tw_dso_period',value:apId });
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_legal_entity' ,value: result.getValue({name: 'subsidiary',summary: 'group'})});
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_amount_ar' ,value:result.getValue({name: 'amount',summary: 'sum'})});
	    		    var myRecId = newRatio.save({enableSourcing : true, ignoreMandatoryFields: true});
    		   return true;
    		});
    		
      } 
      function createAPbyPeriod(apId,startDate,endDate){
    	  log.debug('accounting perido start end ', apId +' - '+startDate + ' - '+ endDate );
    	  var transactionSearchObj = search.create({
    		   type: "transaction",
    		   filters:
    		   [
    			   ["accountingperiod.enddate","onorbefore", endDate], 
    			      "AND", 
    			      ["accounttype","anyof","AcctPay"], 
    			      "AND", 
    			      ["account","anyof","294","295","296"], 
    			      "AND", 
    			      ["subsidiary.isinactive","is","F"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({
    		         name: "subsidiary",
    		         summary: "GROUP",
    		         label: "Legal Entity"
    		      }),
    			  search.createColumn({
    		         name: "account",
    		         summary: "GROUP",
    		         label: "Account"
    		      }),
    			  
    		      search.createColumn({
    		          name: "amount",
    		          summary: "SUM",
    		          label: "Amount"
    		       }),
    		      
    		   ]
    		});
    		var searchResultCount = transactionSearchObj.runPaged().count;
    		log.debug("transactionSearchObj result count",searchResultCount);
    		
    		
    		transactionSearchObj.run().each(function(result){
    		 var newRatio= record.create({type:'customrecord_tw_dso_ratio',isDynamic: true});
    		    log.debug('running results ', 'Account result'+ result.getValue({name: 'account ',summary: 'group'})) ;  	
    		  
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_gl_act' ,value: result.getValue({name: 'account',summary: 'group'})});
	    		    newRatio.setValue({fieldId: 'custrecord_tw_dso_period',value: parseInt(apId) });
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_legal_entity' ,value: result.getValue({name: 'subsidiary',summary: 'group'})});
	    		    newRatio.setValue({fieldId:'custrecord_tw_dso_amount_ap' ,value:result.getValue({name: 'amount',summary: 'sum'})});
	    		    var myRecId = newRatio.save({enableSourcing : true, ignoreMandatoryFields: true});
    		   return true;
    		});
    		
      } 
      
  function createRevenueByPeriod(apId,startDate,endDate){    
     
	  var transactionSearchObj = search.create({
    	   type: "transaction",
    	   filters:
    	   [
    		  ["accounttype","anyof","OthIncome","Income"], 
    	       "AND", 
    	      ["type","anyof","CustCred","Journal","CustInvc","CustPymt"],
    	      "AND", 
    	      ["postingperiod","abs",apId],
    	   ],
    	   columns:
    	   [
    	      search.createColumn({
    	         name: "subsidiary",
    	         summary: "GROUP",
    	         label: "Legal Entity"
    	      }),
    	      
    	      search.createColumn({
    	          name: "amount",
    	          summary: "SUM",
    	          label: "Amount"
    	       })
    	      //search.createColumn({
    	      //   name: "formulacurrency",
    	      //   summary: "SUM",
    	      //   formula: "CASE WHEN ({accountingperiod.internalid}=" +apId + ")  THEN CASE  WHEN {custbody_billable_expenses}='T' THEN {netamountnotax}  ELSE {amount}   END  END ",
    	      //}),
    	      
    	   ]
    	});
    	var searchResultCount = transactionSearchObj.runPaged().count;
    	log.debug("transactionSearchObj result count",searchResultCount);
    	transactionSearchObj.run().each(function(result){
    	   // .run().each has a limit of 4,000 results
    		 var newRatio= record.create({type:'customrecord_tw_dso_ratio',isDynamic: true});
    		 newRatio.setValue({fieldId: 'custrecord_tw_dso_period',value:apId });
    		 newRatio.setValue({fieldId:'custrecord_tw_dso_legal_entity' ,value: result.getValue({name: 'subsidiary',summary: 'group'})});
    		 newRatio.setValue({fieldId:'custrecord_tw_dso_amount' ,value:result.getValue({name: 'amount',summary: 'sum'})});
    		 // newRatio.setValue({fieldId:'custrecord_tw_dso_amount' ,value:result.getValue({name: 'formulacurrency',summary: 'sum',
    		//	 formula : "CASE WHEN ({accountingperiod.internalid}=" +apId + ")  THEN CASE  WHEN {custbody_billable_expenses}='T' THEN {netamountnotax}  ELSE {amount}   END  END "})});
    		 var myRecId = newRatio.save({enableSourcing : true, ignoreMandatoryFields: true});
    		return true;
    	});
  }
  
  function createCogsbyPeriod(apId,startDate,endDate){
	  var transactionSearchObj = search.create({
   	   type: "transaction",
   	   filters:
   	   [
   		 ["accounttype","anyof","COGS"],
   	      "AND", 
   	      ["postingperiod","abs",apId],
   	      "AND", 
	      ["subsidiary.isinactive","is","F"]
   	   ],
   	   columns:
   	   [
   	      search.createColumn({
   	         name: "subsidiary",
   	         summary: "GROUP",
   	         label: "Legal Entity"
   	      }),
   	      
   	      search.createColumn({
   	          name: "amount",
   	          summary: "SUM",
   	          label: "Amount"
   	       })
   	      //search.createColumn({
   	      //   name: "formulacurrency",
   	      //   summary: "SUM",
   	      //   formula: "CASE WHEN ({accountingperiod.internalid}=" +apId + ")  THEN CASE  WHEN {custbody_billable_expenses}='T' THEN {netamountnotax}  ELSE {amount}   END  END ",
   	      //}),
   	      
   	   ]
   	});
   	var searchResultCount = transactionSearchObj.runPaged().count;
   	log.debug("transactionSearchObj result count",searchResultCount);
   	transactionSearchObj.run().each(function(result){
   	   // .run().each has a limit of 4,000 results
   		 var newRatio= record.create({type:'customrecord_tw_dso_ratio',isDynamic: true});
   		 newRatio.setValue({fieldId: 'custrecord_tw_dso_period',value:apId });
   		 newRatio.setValue({fieldId:'custrecord_tw_dso_legal_entity' ,value: result.getValue({name: 'subsidiary',summary: 'group'})});
   		 newRatio.setValue({fieldId:'custrecord_tw_dso_amount_cogs' ,value:result.getValue({name: 'amount',summary: 'sum'})});
   		 // newRatio.setValue({fieldId:'custrecord_tw_dso_amount' ,value:result.getValue({name: 'formulacurrency',summary: 'sum',
   		//	 formula : "CASE WHEN ({accountingperiod.internalid}=" +apId + ")  THEN CASE  WHEN {custbody_billable_expenses}='T' THEN {netamountnotax}  ELSE {amount}   END  END "})});
   		 var myRecId = newRatio.save({enableSourcing : true, ignoreMandatoryFields: true});
   		return true;
   	});
	  
	  
  }
  
  function calcDSOPeriodSubsidiary(acPeriod, subSidiary){
	  
	  //search the custom record 
	  
	  var customrecord_tw_dso_ratioSearchObj = search.create({
		   type: "customrecord_tw_dso_ratio",
		   filters:
		   [
		      ["custrecord_tw_dso_period.internalid","anyof",acPeriod]
		   ],
		   columns:
		   [
		      search.createColumn({
		         name: "custrecord_tw_dso_legal_entity",
		         summary: "GROUP",
		         label: "Legal Entity"
		      }),
		    search.createColumn({
		         name: "custrecord_tw_dso_period",
		         summary: "GROUP",
		         label: "AC Period"
		      }),
		      search.createColumn({
		         name: "custrecord_tw_dso_amount",
		         summary: "SUM",
		         label: "Amount"
		      }),
		      search.createColumn({
		         name: "custrecord_tw_dso_amount_ar",
		         summary: "SUM",
		         label: "Amount AR"
		      })
		   ]
		});
	    
		var searchResultCount = customrecord_tw_dso_ratioSearchObj.runPaged().count;
		log.debug("customrecord_tw_dso_ratioSearchObj result count",searchResultCount);
		customrecord_tw_dso_ratioSearchObj.run().each(function(result){
            var subSales = result.getValue({name : 'custrecord_tw_dso_amount' ,summary: 'SUM'});
            var subAR =result.getValue({name : 'custrecord_tw_dso_amount_ar'  ,summary: 'SUM'});
            var sub =result.getValue({name : 'custrecord_tw_dso_legal_entity' ,summary: 'GROUP'});
            var acPeriod =result.getValue({name : 'custrecord_tw_dso_period' ,summary: 'GROUP'});
            
            var acDates = search.lookupFields({
                type: 'accountingperiod',
                id: acPeriod,
                columns: ['startdate', 'enddate']
            });
            var endDate = Date.parse(acDates.enddate)/(1000 * 60 * 60 * 24);
            var startDate = Date.parse(acDates.startdate)/(1000 * 60 * 60 * 24);
            endDate = endDate +1

            var daysInPeriod = endDate-startDate;
            
                if( subSales>0 && subAR>0){
                	//create DSO line for this period. 
                	var dso = ((daysInPeriod)/(subSales/subAR));
                	dso= Math.round(dso);
                	dso=dso.toFixed(0);
                	var newRatio= record.create({type:'customrecord_tw_dso_ratio',isDynamic: true});
                	newRatio.setValue({fieldId : 'custrecord_tw_dso_period',value : acPeriod});
                	newRatio.setValue({fieldId : 'custrecord_tw_dso_legal_entity',value : sub});
                	newRatio.setValue({fieldId : 'custrecord_tw_dso_dso',value : dso});
                	var myRecId = newRatio.save({enableSourcing : true, ignoreMandatoryFields: true});
                }
			// .run().each has a limit of 4,000 results
		   return true;
		});
	  
  }
  function deleteAll(){
	    
	    var customrecord_tw_dso_ratioSearchObj = search.create({
	    	   type: "customrecord_tw_dso_ratio",
	    	   filters:
	    	   [
	    	   ],
	    	   columns:
	    	   [
	    	      search.createColumn({
	    	         name: "internalid"
	    	         
	    	      }),
	    	   ]
	    	});
	    	var searchResultCount = customrecord_tw_dso_ratioSearchObj.runPaged().count;
	    	log.debug("customrecord_tw_dso_ratioSearchObj result count",searchResultCount);
	    	customrecord_tw_dso_ratioSearchObj.run().each(function(result){
	    	   // .run().each has a limit of 4,000 results
	    	     record.delete({type: 'customrecord_tw_dso_ratio',
	    	               id: result.id
	    				   });


	    	   return true;
	    	});
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
