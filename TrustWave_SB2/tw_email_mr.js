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
    'N/format',
    'N/task',
    'N/render'
], function (search, record, error, runtime, email, file,format,task,render) {

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
        var subject = 'Mass Email Script  ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
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
    	var scriptObj = runtime.getCurrentScript();
       // var invToMail =[];
        invToMail = JSON.parse(scriptObj.getParameter({name: 'custscript_invoices_to_process'}));
        log.debug('InvoiceToMail  ' , invToMail);
        return invToMail;
     }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	var searchResult = JSON.parse(context.value);
      	log.debug('map ', searchResult);
    	context.write({
            key: searchResult.transId,
            value : searchResult
        	});
    	//return context;
      }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	
    	
    	log.debug('context key   ', context.key);
    	log.debug('context values   ', context.values);  
    	sendEmail(context.key,'invoice');
    	
///   	createDSORatio(context.key);
    }

    function sendEmail(transId, transType , docNumber,context){
    	var scriptObj = runtime.getCurrentScript();
		
    	var folderId = scriptObj.getParameter({name: 'custscript_tw_invoice_folder_id'});
		var templateId = scriptObj.getParameter({name: 'custscript_tw_mass_email_template'});
     toEmail='russell.fulling@trustwave.com';
     try{
     var primaryEmail =toEmail;
     if (toEmail)
      	{
    	  	var cc = [];
    	  	toEmail = toEmail.split(',');
    	  	primaryEmail=toEmail[0];
    	  	for (var x = 0; x<toEmail.length-1; x++){
    	  		cc[x] = toEmail[x+1];
    	  	}
    	 }
    	 //create a new message for this invoice 
    	 var msgRec = record.create({type: record.Type.MESSAGE,isDynamic: false});
		   
			//Get Sales Order Reference
         //todo load regular template if not AssetId
 	   log.debug('here is the transId ' , transId);
 	   log.debug('here is the transType ' , transType);

 	   transType = transType.trim();
 	   var invRec = record.load({type:transType,id:transId});
      var docNumber=invRec.getValue({fieldId: 'tranid'});
 	   //Load template and populate with record
 	  log.debug('transaction Loaded ', invRec);
 	   
 	  var transactionFile = render.transaction({entityId: parseInt(transId), printMode: render.PrintMode.PDF,inCustLocale: true});
 	   transactionFile.name='Customer Invoice - '+ docNumber +'.pdf';
 	   transactionFile.folder=folderId; 
 	   
 	   var fileID = transactionFile.save();
 	   var fileAttach = file.load({id:fileID});
 	  var mergeResult = render.mergeEmail({templateId: templateId, transactionId: transId,custmRecord: null});
 	  renderSubj=mergeResult.subject;
 	  renderBody=mergeResult.body;
 	  
 	  email.send({author:48513,recipients: primaryEmail ,subject: renderSubj,body :renderBody, attachments: [fileAttach],cc:cc, relatedRecords: {transactionId : transId}});
	
   }catch(e){
			log.error({title:'FAILED TO ATTACH SERVICE PDF',details:e.message});
	  }
     	return true;;
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
