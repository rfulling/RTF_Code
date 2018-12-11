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
        var subject = 'CSV create Script  ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
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
            log.debug('in teh each ', contents);
            //return true;
        });


        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;
            /*
                        var rec = record.create({
                            type: 'customrecord_summary',
                        });
            
                        rec.setValue({
                            fieldId: 'name',
                            value: 'Summary for  script: ' + runtime.getCurrentScript().id
                        });
            
                        rec.setValue({
                            fieldId: 'custrecord_time',
                            value: seconds
                        });
                        rec.setValue({
                            fieldId: 'custrecord_usage',
                            value: usage
                        });
                        rec.setValue({
                            fieldId: 'custrecord_yields',
                            value: yields
                        });
            
                        rec.save();
                        */
        }

        catch (e) {
            handleErrorAndSendNotification(e, 'summarize');
        }
    }

    function getInputData() {
      
    	var rev_commit_automationSearchObj = search.create({
            		   type: "customrecordtw__rev_commit_automation",
            		   filters:
            		   [
            			   ["custrecord_tw_rev_rec","anyof","@NONE@"]
            		   ],
            		   columns:
            		   [
            		      search.createColumn({name: "custrecord_tw_rec_commit_automation", label: "Sales Order"}),
            		      search.createColumn({name: "custrecordtw_rev_commit_auto_crm_id", label: "CRM ID"}),
            		      search.createColumn({name: "custrecord_tw_re_commit_autu_sku", label: "Sku Item"}),
            		      search.createColumn({name: "custrecord_tw_rev_commit_auto_qty", label: "Quanity"}),
            		      search.createColumn({name: "custrecord_tw_rev_commit_auto_amt", label: "Amount"}),
            		      search.createColumn({name: "custrecord_tw_rev_commit_auto_start", label: "Rev Rec Start"}),
            		      search.createColumn({name: "custrecord_tw_rev_commit_auto_enddate", label: "Rev Rec End"})
            		   ]
            		});
            		//var searchResultCount = customrecordtw__rev_commit_automationSearchObj.runPaged().count;
            		//log.debug("customrecordtw__rev_commit_automationSearchObj result count",searchResultCount);
            		
        return rev_commit_automationSearchObj;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
     //log.debug('raw context ', context );
    	var searchResult = JSON.parse(context.value);
    //	log.debug('Context.value parsed ', searchResult);
      //  log.debug('map SearchResults ', searchResult.values.custrecord_tw_rec_commit_automation.value);
      //  log.debug('map SearchResults.value ', searchResult)

    	//log.debug('length of values ', context.values.length);
        	
    	context.write({
            key: searchResult.values.custrecord_tw_rec_commit_automation.value,
            value : searchResult.id
        	});
        	
        	

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

       // var arrOFItems  = JSON.parse(context.values);
       
        
        var itemS = [];
        itemS = JSON.stringify(context);
        itemS=JSON.parse(itemS);
       log.debug('id of customRecord  ', context.key); 
      log.debug('contexxt should be soids  ', itemS);
      //here send the key and the array ato the
      //arrOFItems=JSON.parse(arrOFItems.values)
     
       
         transformCommit(context.key);
        
        
    }

      function transformCommit(soID){
    	  
        var revCommit = record.transform({ 
          	fromType : record.Type.SALES_ORDER,
          	fromId : soID,
           	toType : record.Type.REVENUE_COMMITMENT,
           	isDynamic: false
          	
      });
    	 var lineCount = revCommit.getLineCount({sublistId : 'item'});
    	  var arrItem =[];   
    	  //loop through the new record 
    	       for (var x = 0; x < lineCount; x++) {
    	    	   
    	    	   subLineItem=revCommit.getSublistValue({
    	        	   sublistId: 'item',
    	        	   fieldId: 'item',
    	        	   line: x
    	    	   }); 
    	              //log.debug('evaluating the array of items ', soID + '  item ' + subLineItem)
		    	      
    	            var  arrItem =  checkItemInArray(soID,subLineItem);
    	           // log.debug('arrItem ', arrItem);
    	            
    	            
    	              log.debug('startDate ', arrItem.getValue({name:'custrecord_tw_rev_commit_auto_start'}));
		    	 
    	              log.debug('endDate ', arrItem.getValue({name:'custrecord_tw_rev_commit_auto_enddate'}));
		    	      log.debug('amount ', arrItem.getValue({name:'custrecord_tw_rev_commit_auto_qty'}));
		    	      log.debug('qty ', arrItem.getValue({name:'custrecord_tw_rev_commit_auto_amt'}));
		    	   
		    	    if(arrItem){
		    	    	  //log.debug('get the endDate ', arrItem[0].endDate);
		    	    	
		    	    	   var startDate= new Date(arrItem.getValue({name:'custrecord_tw_rev_commit_auto_start'}));
		    	    	   var endDate= new Date(arrItem.getValue({name:'custrecord_tw_rev_commit_auto_enddate'}));
		    	   
		    	    	  revCommit.setSublistValue({
		          		   sublistId: 'item', 
		          		   fieldId: 'quantity', 
		          		   line: x , 
		          		   value: arrItem.getValue({name:'custrecord_tw_rev_commit_auto_qty'}),
		          		   }),
		          		   
		          		   revCommit.setSublistValue({
		          		   sublistId: 'item', 
		          		   fieldId: 'revrecstartdate', 
		          		   line: x , 
		          		   value: startDate
		          		   }),
		          		    revCommit.setSublistValue({
		          		   sublistId: 'item', 
		          		   fieldId: 'amount', 
		          		   line: x , 
		          		   value: arrItem.getValue({name:'custrecord_tw_rev_commit_auto_amt'}),
		          		   }),
		          		   
		          		   revCommit.setSublistValue({
		          		   sublistId: 'item', 
		          		   fieldId: 'revrecenddate', 
		          		   line: x , 
		          		   value: endDate
		          		   })
		    	    
		    	    }else if(!arrItem){
		    	    	  //remove theline. 
		    	    	   revCommit.removeLine({
		           		   sublistId: 'item',
		           		   line : x,
		           		   ignoreRecalc: true
		           		   });
		    	    	  lineCount-- ;
		    	    	  x-- ;
		    	    	  
		    	      }
			       }
    	      
    	       log.debug('about to save ', 'commit');
    	       try{      
    	                var cId = revCommit.save({enableSourcing: false,ignoreMandatoryFields: true});
      	        }catch(e){
      	        	handleErrorAndSendNotification(e, 'summarize');
    	   		}
      	        
      	        if(cId){
      	        	updateCustRecWithCommit(cId);
      	        }
    	       //if this succeeds we need to update all the custom rev commits with this id. 
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
     
      function updateCustRecWithCommit(commitId){
    	  //open the new commmit
    	 
    	  var revCommitted = record.load({ 
          	type : record.Type.REVENUE_COMMITMENT,
          	id   : commitId,
          	isDynamic: false
          	
          });
    	  
    	  var soId = revCommitted.getValue({fieldId: 'createdfrom'});
    	  
    	  var lineCount = revCommitted.getLineCount({sublistId : 'item'});  
    	  
    	  for (var x = 0; x < lineCount; x++) {
    	        var subLineItem=revCommitted.getSublistValue({
    	        	   sublistId: 'item',
    	        	   fieldId: 'item',
    	        	   line: x
    	           });
    	      var arrCustRec = checkItemInArray(soId,subLineItem);
    	      var cusRecInteral = arrCustRec.getValue({name : 'internalid'});
    	           record.submitFields({
    	        	    type: 'customrecordtw__rev_commit_automation',
    	        	    id: cusRecInteral,
    	        	    values: {
    	        	    	custrecord_tw_rev_rec: commitId,
    	        	    },
    	        	    options: {
    	        	        enableSourcing: false,
    	        	        ignoreMandatoryFields : true
    	        	    }
    	        	});     
    	           
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
        reduce: reduce,
        summarize: summarize
    };

});
