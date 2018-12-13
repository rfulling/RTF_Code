/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/http',
        'N/ui/serverWidget',
        'N/search',
        'N/task',
        'N/runtime',
        'N/record',
        'N/email',
        'N/render',
        'N/file'], function (http, ui, search, task, runtime, record,email,render,file) {

            /**
             * Definition of the Suitelet script trigger point.
             *
             * @param {Object} context
             * @param {ServerRequest} context.request - Encapsulation of the incoming request
             * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
             * @Since 2015.2
             */
            function onRequest(context) {
               
            	if (context.request.method === 'GET') {
                    var objForm = ui.createForm({
                        title: 'Mass Email Invoices'
                        //clientScriptFileId: 7579
                    });
                        var actPeriodStart = objForm.addField({
                        id: 'custpage_period_start',
                        type: ui.FieldType.DATE,
                        label: 'Start Date',
                    });
                    var actPeriodEnd = objForm.addField({
                        id: 'custpage_period_end',
                        type: ui.FieldType.DATE,
                        label: 'End Date',
                    });
                   
                    var batchName = objForm.addField({
                        id: 'custpage_batch_id',
                        type: ui.FieldType.SELECT,
                        label: 'Batch Number',
                        source: 'customlist_batch_name'

                    });
                    actPeriodStart.isMandatory = true;
                    actPeriodEnd.isMandatory = true;
                    batchName.isMandatory = true;
                   
                    var mysub1 = objForm.addSubmitButton({label: 'Search'});
                    //hid this field when ready
                    objForm.addField({id: 'custpage_method',type: ui.FieldType.TEXT,label: 'Method'}).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN}).defaultValue = "Search";
                    context.response.writePage(objForm);

                } else if (context.request.parameters.custpage_method == "Search") {
                    //show the results form 
                    log.debug('pushed search start Date = ',context.request.parameters.custpage_period_start );
                	var startDate  = context.request.parameters.custpage_period_start;
                    var endDate = context.request.parameters.custpage_period_end;
                    var intBatchId = context.request.parameters.custpage_batch_id;

                    objForm=showResults(context, startDate, endDate, intCustName,intBatchId);

                  //  context.response.writePage(objForm);


                } else if (context.request.parameters.custpage_method == "Submit") {
                    //show the process form 
                    var intCustName = null;
                    var req = context.request;
                    var sDate = req.parameters.custpage_act_period;
                    var batch = req.parameters.custpage_batch_id_test;
                    var delimiter = /\u0001/;
                    
                    var subListFields = req.parameters.custpage_mysublistfields.split(delimiter);
                    var intLineItemCount= req.getLineCount({group: 'custpage_mysublist'});
                    
                    context.request.parameters.custpage_method ="GET";
                  
                    for (var i = 0; i < intLineItemCount; i++){
                	   var toProc = req.getSublistValue({group: 'custpage_mysublist',name: 'custpage_process',line: i});
                	     if(toProc=='T'){
                	    	   var intTranid = parseInt(req.getSublistValue({group: 'custpage_mysublist',name: 'custpage_inv_internal',line: i}));
		                       var toEmail =req.getSublistValue({group: 'custpage_mysublist',name: 'custpage_inv_email',line: i});
		                       var docNumber =req.getSublistValue({group: 'custpage_mysublist', name: 'custpage_tranid',line: i});
		                	         log.debug('internla id  ',docNumber );
		                	         sendEmail(intTranid, toEmail,'invoice',docNumber)
                	     }
                           }
                   
                   showMessagePage(context);
                 }
            }
            
            /*function createAndSubmitMapReduceJob(requstedPeriod, context, objForm) {
                var mapReduceScriptId = 'customscript_jm_mrs_apply_payments';
                log.audit('mapreduce id: ', mapReduceScriptId);
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE
                });
                mrTask.scriptId = mapReduceScriptId;
                mrTask.deploymentId = 'customdeployjm_mrs_apply_papyments';

                mrTask.params = { 'custscript_actPeriod': requstedPeriod };

              //  log.debug('params' + mrTask.params);

                var mrTaskId = mrTask.submit();
                var taskStatus = task.checkStatus(mrTaskId);
                if (taskStatus.status === 'FAILED') {
                    var authorId = -5;
                    var recipientEmail = 'rfulling@netsuite.com';
                    email.send({
                        author: authorId,
                        recipients: recipientEmail,
                        subject: 'Failure executing map/reduce job!',
                        body: 'Map reduce task: ' + mapReduceScriptId + ' has failed.'
                    });
                }
                //resest button to search

                showMessagePage(context);
            }*/
            
            function showMessagePage(context) {
              
            	var objFormm = ui.createForm({
                    title: 'Invoice Mailings'
                });
                var msgField = objFormm.addField({
                    id: 'custpage_waiting_messate',
                    type: ui.FieldType.INLINEHTML,
                    label: 'Waiting Text',
                    defaultValue: 'Your Request has been submitted to be processed'
                });
                msgField.defaultValue = 'Your Request has been submitted to be processed';
                context.response.writePage(objFormm);
            }
            
            function showResults(context, startDate, endDate, intCustName,intBatchId) {
            	log.debug('startDate ', startDate);
                //Conditional filter here 
               var sDate = new Date(startDate);
               var eDate = new Date(endDate);
                var objForm = ui.createForm({title: 'Email Invoices'});
                var actPeriodStart = objForm.addField({
                    id: 'custpage_period_start',
                    type: ui.FieldType.DATE,
                    label: 'Start Date'
                  }).updateDisplayType({displayType: ui.FieldDisplayType.INLINE}).defaultValue = sDate
                var actPeriodEnd = objForm.addField({
                    id: 'custpage_period_end',
                    type: ui.FieldType.DATE,
                    label: 'End Date'
                }).updateDisplayType({displayType: ui.FieldDisplayType.INLINE}).defaultValue = eDate
                var batchId = objForm.addField({
                    id: 'custpage_batch_id_test',
                    type: ui.FieldType.SELECT,
                    label: 'Batch Number',
                    source: 'customlist_batch_name',
                    isMandatory : true
                 })
                batchId.updateDisplayType({displayType: ui.FieldDisplayType.INLINE}).defaultValue = intBatchId;
                var myButton = objForm.addSubmitButton({
                    id: 'custpage_sbutton',
                    label: 'Process'
                });
                var myButton = objForm.addResetButton({
                    id: 'custpage_sreturn',
                    label: 'Return'
                });
                var submitField = objForm.addField({
                    id: 'custpage_method',
                    type: ui.FieldType.TEXT,
                    displayType: 'Normal',
                    label: 'Method',
                }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN}).defaultValue = "Submit"


            var paySublist = objForm.addSublist({ id: 'custpage_mysublist', type: 'list', label: 'Invoices', tab: null })
              
             
              log.debug('batch = ' )
           
             
              var getInvData = invoiceData(intBatchId,startDate,endDate);
              log.debug('revrec  ', invoiceData);
              var name =''
              var nameId =''
              var srcTrans ='';
              var amt ='';
              //go through the result set and build an array of accounting period names 
              //static sublist so add fields here
              paySublist.addField({id: 'custpage_process',label: 'Select', type: ui.FieldType.CHECKBOX});
              paySublist.addField({id: 'custpage_inv_internal',label: 'Select', type: ui.FieldType.SELECT,source: 'invoice'}).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
              paySublist.addField({id: 'custpage_tranid',label: 'DocumentNumber', type: ui.FieldType.TEXT});
              paySublist.addField({id: 'custpage_trdate',label: 'Date', type: ui.FieldType.DATE});
              paySublist.addField({id: 'custpage_amt',label: 'Amount', type: ui.FieldType.CURRENCY});
             // paySublist.addField({id: 'custpage_amt',label: 'Amount', type: ui.FieldType.CURRENCY});
              paySublist.addField({id: 'custpage_from_email',label: 'From Email', type: ui.FieldType.TEXT});
              var cust=paySublist.addField({id: 'custpage_cust_name',label: 'Customer', type: ui.FieldType.SELECT , source : 'customer'});
              cust.updateDisplayType({displayType: ui.FieldDisplayType.INLINE});
              
              
              paySublist.addField({id: 'custpage_inv_email',label: 'Invoice Email', type: ui.FieldType.TEXT});
              paySublist.addField({id: 'custpage_cust_email',label: 'Customer Email', type: ui.FieldType.TEXT});
              
              for (var a = 0; a < getInvData.length ; a++) {
            	  paySublist.setSublistValue({id: 'custpage_inv_internal', line: a,value: getInvData[a].getValue({name: 'internalid'})});
            	  paySublist.setSublistValue({id: 'custpage_tranid', line: a,value: getInvData[a].getValue({name: 'tranid'})});
            	  paySublist.setSublistValue({id: 'custpage_trdate', line: a,value: getInvData[a].getValue({name: 'trandate'})});
            	  paySublist.setSublistValue({id: 'custpage_amt', line: a,value: getInvData[a].getValue({name: 'amount'})});
            	  paySublist.setSublistValue({id: 'custpage_from_email', line: a,value: getInvData[a].getValue({name: 'custbody_email_address'})});
            	  paySublist.setSublistValue({id: 'custpage_cust_name', line: a,value: getInvData[a].getValue({name: 'internalid', join: 'customerMain'})});
            	
            	  if(getInvData[a].getValue({name: 'custbody_to_email'})){
            	      paySublist.setSublistValue({id: 'custpage_inv_email', line: a,value: getInvData[a].getValue({name: 'custbody_to_email'})});
            	  }
            	  paySublist.setSublistValue({id: 'custpage_cust_email', line: a,value: getInvData[a].getValue({name: 'email', join: 'customerMain'})});
            	  
              }
                    context.response.writePage(objForm)
                //return objForm;
            }
            
            
            function getActPeriods(arPeriods){
            	var accountingperiodSearchObj = search.create({
            		   type: "accountingperiod",
            		   filters:
            			   [
            			      ["isquarter","is","F"], 
            			      "AND", 
            			      ["isyear","is","F"], 
            			      "AND", 
            			      ["startdate","onorafter","1/1/2017"]
            			   ],
            			   columns:
            			   [
            			      search.createColumn({
            			         name: "internalid",
            			         sort: search.Sort.ASC,
            			         label: "Internal ID"
            			      }),
            			      search.createColumn({name: "periodname", label: "Name"})
            			   ]
            		});
            	 
            	  var myactPeriod = accountingperiodSearchObj.run().getRange({
                      start: 0,
                      end: 300
                  });
              
            return myactPeriod;

            }

            function invoiceData(batchId,startDate,endDate){
            	log.debug('search params = ',batchId+ ' '+startDate + ' ' + endDate );
            	var invoiceSearchObj = search.create({
            		   type: "invoice",
            		   filters:
            		   [
            		      ["type","anyof","CustInvc"], 
            		      "AND", 
            		      ["mainline","is","T"], 
            		      "AND", 
            		      ["status","anyof","CustInvc:A"], 
            		      "AND", 
            		      ["custbody3","anyof",batchId],
            		      "AND", 
            		      ["trandate","within",startDate,endDate]
            		   ],
            		   columns:
            		   [
            			  search.createColumn({name: "internalid"}),
            		      search.createColumn({name: "trandate",sort: search.Sort.ASC,label: "Date"}),
            		      search.createColumn({name: "custbody3", label: "Batch Name"}),
            		      search.createColumn({name: "tranid", label: "Document Number"}),
            		      search.createColumn({name: "amount", label: "Amount"}),
            		      search.createColumn({name: "custbody_email_address", label: "Email address"}),
            		      search.createColumn({name: "internalid", join: "customerMain",label: "Name"}),
            		      search.createColumn({name: "custbody_to_email", label: "Invoice Email"}),
            		      search.createColumn({name: "email",join: "customerMain",label: "Customers Email"})
            		   ]
            		});
            	//var invoicesToPrint = [];
            		var searchResultCount = invoiceSearchObj.runPaged().count;
            		log.debug("invoiceSearchObj result count",searchResultCount);
            		var invoiceToPrint = invoiceSearchObj.run().getRange({
                        start: 0,
                        end: 200
                    });
                   //log.debug('seasrchResults ', invoiceToPrint);
            	return invoiceToPrint;

           }
            
          function sendEmail(transId, toEmail,transType,docNumber){
             var pdfTemplateFileId = 5;
             var pdfStorageFolderId=525484;	
          //   toEmail='russell.fulling@trustwave.com';
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
 			  //Load template and populate with record
 	    	  // log.debug('transaction Loaded ', invRec);
 	    	   
 	    	  var transactionFile = render.transaction({entityId: parseInt(transId),printMode: render.PrintMode.PDF,inCustLocale: true});
 	    	   transactionFile.name='Customer Invoice - '+ docNumber +'.pdf';
 	    	   transactionFile.folder=pdfStorageFolderId; 
 	    	   
         	   var fileID = transactionFile.save();
         	   var fileAttach = file.load({id:fileID});
 	    	  var mergeResult = render.mergeEmail({templateId: 5,transactionId: transId,custmRecord: null});
 	    	  renderSubj=mergeResult.subject;
 	    	  renderBody=mergeResult.body;
 	    	  
 	    	  email.send({author:1392262,recipients: primaryEmail ,subject: renderSubj,body :renderBody, attachments: [fileAttach],cc:cc, relatedRecords: {transactionId : transId}});
				
 	    	/*  msgRec.setValue({fieldId: 'subject',value: renderSubj});				 
				 msgRec.setValue({fieldId: 'message',value: renderBody});
				 msgRec.setValue({fieldId: 'transaction',value: transId});
				 msgRec.setValue({fieldId: 'emailed',value: true});
				 msgRec.setValue({fieldId: 'recipientemail',value: toEmail});
				 msgRec.setValue({fieldId: 'author',value: 1392262});
				  var index = msgRec.getLineCount({sublistId: 'mediaitem'});
				  log.debug('what index ',index);
				  msgRec.setSublistValue({sublistId: 'mediaitem', fieldId: 'mediaitem', line: index  , value: fileID});
				 var  messegeid=msgRec.save({ enableSourcing: true, ignoreMandatoryFields : true});*/
 	      }catch(e){
 				log.error({title:'FAILED TO ATTACH SERVICE PDF',details:e.message});
 		  }
             	return true;;
       }
            
           
        
            // ;
            return {
                onRequest: onRequest,
              //  createAndSubmitMapReduceJob: createAndSubmitMapReduceJob,
                showResults: showResults
            };


        });
