/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/http',
        'N/ui/serverWidget',
        'N/search',
        'N/task',
        'N/runtime'], function (http, ui, search, task, runtime, serverWidget) {

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
                        title: 'Process Payments by Period'
                        //clientScriptFileId: 7579
                    });

                    var cusFilter = search.createFilter({
                        name: 'entity',
                        operator: search.Operator.ANYOF,
                        values: intCustName
                    });
                    // objForm.clientScriptFileId = 372;

                    //    log.debug('actPeriod GET', context.request.parameters.actPeriod);
                    var actPeriodStart = objForm.addField({
                        id: 'custpage_act_period_start',
                        type: ui.FieldType.SELECT,
                        label: 'Act. Period Start',
                        source: 'accountingperiod'

                    });
                    var actPeriodEnd = objForm.addField({
                        id: 'custpage_act_period_end',
                        type: ui.FieldType.SELECT,
                        label: 'Act. Period End',
                        source: 'accountingperiod'

                    });

                    var custName = objForm.addField({
                        id: 'custpage_legal_entity',
                        type: ui.FieldType.SELECT,
                        label: 'E ',
                        source: 'subsidiary'

                    });
                    var mysub1 = objForm.addSubmitButton({
                        label: 'Search'
                    });
                    //hid this field when ready
                    objForm.addField({
                        id: 'custpage_method',
                        type: ui.FieldType.TEXT,
                        label: 'Method',
                    }).defaultValue = "Search";

                    context.response.writePage(objForm);

                } else if (context.request.parameters.custpage_method == "Search") {
                    //show the results form 
                    var requstedPeriod = context.request.parameters.custpage_act_period_start;
                    var intCustName = context.request.parameters.custpage_legal_entity;

                    objForm = showResults(context, requstedPeriod, intCustName);

                    context.response.writePage(objForm);


                } else if (context.request.parameters.custpage_method == "Submit") {
                    //show the process form 
                    var intCustName = null;
                    var request = context.request;
                    var requstedPeriod = context.request.parameters.custpage_act_period;
                    var intCustName = context.request.parameters.custpage_legal_entity;
                   // log.debug('actPeriod', context.request.parameters.custpage_act_period);

                    var objForm = ui.createForm({
                        title: 'Apply Payments by Period'

                    });
                    //    log.debug('actPeriod GET', context.request.parameters.actPeriod);
                    var actPeriod = objForm.addField({
                        id: 'custpage_act_period',
                        type: ui.FieldType.SELECT,
                        label: 'Act. Period',
                        source: 'accountingperiod'

                    });
                    var custName = objForm.addField({
                        id: 'custpage_legal_entity',
                        type: ui.FieldType.SELECT,
                        label: 'Legal Entity',
                        source: 'subsidiary'

                    });
                    custName.defaultValue = context.request.parameters.custpage_legal_entity;

                    //Conditional filter here if no customer selected then get all.
                    if (intCustName) {
                        var cusFilter = search.createFilter({
                            name: 'entity',
                            operator: search.Operator.ANYOF,
                            values: intCustName
                        });
                    } else {
                        var cusFilter = search.createFilter({
                            name: 'entity',
                            operator: search.Operator.ISNOTEMPTY

                        });
                    }

                    var procBtn = objForm.addSubmitButton({
                        label: 'Process',
                        id: 'proc1'
                    });

                  //  log.debug('Submitted by ' + context.request.parameters.submitter);
                    var btn = context.request.parameters.submitter;

                    if (btn == 'Search') {
                    } else {
                        createAndSubmitMapReduceJob(requstedPeriod, context, objForm);
                    }
                }

            }
            function createAndSubmitMapReduceJob(requstedPeriod, context, objForm) {
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
            }
            
            function showMessagePage(context) {

                var objFormm = ui.createForm({
                    title: 'Payments Processing'
                });
                var msgField = objFormm.addField({
                    id: 'custpage_waiting_messate',
                    type: ui.FieldType.INLINEHTML,
                    label: 'Waiting Text',
                    defaultValue: 'Your Request has been submitted to be processed'
                });
                // var msgLinkField = objFormm.addField({
                //    id: 'custpage_search_link',
                //     type: ui.FieldType.URL,
                //     label: 'Text',
                //      defaultValue: 'Your Request has been submitted to be processed'
                //    });
                msgField.defaultValue = 'Your Request has been submitted to be processed';
                //    msgLinkField.defaultValue='link here'
                context.response.writePage(objFormm);
            }
            
            function showResults(context, requstedPeriod, legalEntity) {
            	log.debug('customerid ', intCustName);
                //Conditional filter here 
                if (intCustName) {
                    var cusFilter = search.createFilter({
                        name: 'entity',
                        operator: search.Operator.ANYOF,
                        values: intCustName
                    });
                } else {
                    var cusFilter = search.createFilter({
                        name: 'entity',
                        operator: search.Operator.ISNOTEMPTY
                    });
                }
                var objForm = ui.createForm({title: 'DSO by Entity'});
                              
                var actPeriodStart = objForm.addField({
                    id: 'custpage_act_period_start',
                    type: ui.FieldType.SELECT,
                    label: 'Act. Period start',
                    source: 'accountingperiod'

                }).defaultValue = context.request.parameters.custpage_act_period_start;

                var actPeriodEnd = objForm.addField({
                    id: 'custpage_act_period_end',
                    type: ui.FieldType.SELECT,
                    label: 'Act. Period end',
                    source: 'accountingperiod'

                }).defaultValue = context.request.parameters.custpage_act_period_end;

                var custName = objForm.addField({
                    id: 'custpage_legal_entity',
                    type: ui.FieldType.SELECT,
                    label: 'Legal Entity',
                    source: 'subsidiary'

                }).defaultValue = context.request.parameters.custpage_legal_entity;
                var myButton = objForm.addSubmitButton({
                    id: 'custpage_sbutton',
                    label: 'Submit'
                });

                var submitField = objForm.addField({
                    id: 'custpage_method',
                    type: ui.FieldType.TEXT,
                    displayType: 'Hidden',
                    label: 'Method',
                }).defaultValue = "Submit"


              var arrPeriods =[];
              var paySublist = objForm.addSublist({ id: 'custpage_mysublist', type: 'list', label: 'Payments', tab: null })
               

              //get the revenue search  build an array of accounting periods
              var actPeriodNames =[];
              var seaActPeriodNames=[];
              var intDso = dsoData(legalEntity);
              log.debug('revrec  ', revenueRec);
              var name =''
              var nameId =''
              var srcTrans ='';
              var amt ='';
                    //go through the result set and build an array of accounting period names 
              for (var a = 0; a < revenueRec.length ; a++) {
            	  if (actPeriodNames.indexOf(revenueRec[a].getText({name: 'srctranpostperiod',summary: 'group'}))==-1){
            	        actPeriodNames.push(revenueRec[a].getText({name: 'srctranpostperiod', summary: 'group'}));
            	        name =revenueRec[a].getText({name: 'srctranpostperiod', summary: 'group'})
            	        nameId=revenueRec[a].getText({name: 'srctranpostperiod', summary: 'group'}).replace(/\s+/g, '');
            	        amt = revenueRec[a].getValue({name: 'recurfxamount', summary: 'sum'});
            	        srcTrans = revenueRec[a].getValue({name: 'srctran', summary: 'group'});
            	         seaActPeriodNames.push({gridname: name, gridid: nameId , gridamount : amt , gridsource: srcTrans});
            	 }
              }
              log.debug('Revenue Periods ', actPeriodNames);
              
                  log.debug('beforeSplice    ' ,seaActPeriodNames); 
                  if (seaActPeriodNames) {
                    
                	  log.debug('after splice.length  ' ,seaActPeriodNames.length);
                	  log.debug('revenue search.length   ',  actPeriodNames.length);
                	  paySublist.addField({id: 'custpage_tranid',label: 'Source Trans', type: ui.FieldType.TEXT});
                	  for (var i = 0; i < seaActPeriodNames.length ; i++) {
                		 var extraId = seaActPeriodNames[i].gridid.toLowerCase();
                		 var actPeriodname = seaActPeriodNames[i].gridname
                		 paySublist.addField({id: 'custpage_select_actperiod_'+extraId,label: actPeriodname, type: ui.FieldType.TEXT});
                		 
                      	 arrPeriods.push({'periodId':parseInt(extraId) ,'periodName': actPeriodname });
                      	 }
                };
            	
            	 if (seaActPeriodNames) {
                 	for (var x = 0; x < seaActPeriodNames.length ; x++) {
                 	     periodName =  seaActPeriodNames[x].gridname;
                 	     amtMonthly = seaActPeriodNames[x].gridamount;
                 	     thisPeriodId= seaActPeriodNames[x].gridid.toLowerCase();
                 	    thisTransId =seaActPeriodNames[x].gridsource;
                    	     
                 	     paySublist.setSublistValue({
                            id: 'custpage_tranid',
                            line: x,
                            value: thisTransId
                        }),
                 	
                        paySublist.setSublistValue({
                            id: 'custpage_select_actperiod_'+thisPeriodId,
                            line: x,
                            value: amtMonthly
                        });
               
                 	    }
                 	}
                return objForm;
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

            function dsoData(startDate, endDate ){
            	var revRec = search.create({
            		   type: "revrecschedule",
            		   filters:
            		   [
            		      ["customer.internalid","anyof",custId] 
            		     
            		   ],
            		   columns:
            		   [
            		      search.createColumn({
            		         name: "srctran",
            		         summary: "GROUP",
            		         sort: search.Sort.ASC,
            		         label: "Source Transaction"
            		      }),
            		      search.createColumn({
            		         name: "srctranpostperiod",
            		         summary: "GROUP",
            		         sort: search.Sort.ASC,
            		         label: "Posting Period"
            		      }),
            		      search.createColumn({
            		         name: "recurfxamount",
            		         summary: "SUM",
            		         label: "Amount (Foreign Currency)"
            		      }),
            		      search.createColumn({
            		         name: "amount",
            		         summary: "SUM",
            		         label: "Amount (Schedule Total)"
            		      })
            		   ]
            		});
            
  			var myRevRecs = revRec.run().getRange({
                     start: 0,
                     end: 1000
                 });
             return myRevRecs;

           }
            
            function internalIdofPeriod(arrPeriods, txtName){
            	//loop through  the array
            //	log.debug('periods  ' ,arrPeriods);
            //	log.debug('periods name ' ,periodName);
            	var periodId = '';
            	
	            	for (var i = 0; i < arrPeriods.length ; i++){
	            		if(arrPeriods[i].periodName === txtName.trim()){
	            			periodId=arrPeriods[i].periodId;
	            			break;
	            		}
	            	}	            	
	            	
            	return periodId;
            }
            
           
        
            // ;
            return {
                onRequest: onRequest,
                createAndSubmitMapReduceJob: createAndSubmitMapReduceJob,
                showResults: showResults
            };


        });
