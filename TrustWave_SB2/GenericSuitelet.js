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
                        id: 'custpage_customer',
                        type: ui.FieldType.SELECT,
                        label: 'Customer',
                        source: 'customer'

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
                    var intCustName = context.request.parameters.custpage_customer;

                    objForm = showResults(context, requstedPeriod, intCustName);

                    context.response.writePage(objForm);


                } else if (context.request.parameters.custpage_method == "Submit") {
                    //show the process form 
                    var intCustName = null;
                    var request = context.request;
                    var requstedPeriod = context.request.parameters.custpage_act_period;
                    var intCustName = context.request.parameters.custpage_customer;
                    log.debug('actPeriod', context.request.parameters.custpage_act_period);

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
                        id: 'custpage_customer',
                        type: ui.FieldType.SELECT,
                        label: 'Customer',
                        source: 'customer'

                    });
                    custName.defaultValue = context.request.parameters.custpage_customer;

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

                    log.debug('Submitted by ' + context.request.parameters.submitter);
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

                log.debug('params' + mrTask.params);

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
            
            function showResults(context, requstedPeriod, intCustName) {
            	log.debug('showResults ', intCustName);
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


                var objForm = ui.createForm({
                    title: 'Process Payments by Period'

                });
            //    objForm.clientScriptFileId = 7579;

              
                log.debug('actPeriod GET', context.request.parameters.actPeriodStart);
                
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
                    id: 'custpage_customer',
                    type: ui.FieldType.SELECT,
                    label: 'Customer',
                    source: 'customer'

                }).defaultValue = context.request.parameters.custpage_customer;
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


                var paySublist = objForm.addSublist({ id: 'custpage_mysublist', type: 'list', label: 'Payments', tab: null })

                paySublist.addField({
                    id: 'custpage_select_actperiod',
                    label: 'Select',
                    type: ui.FieldType.CHECKBOX
                });

                paySublist.addField({
                    id: 'custpage_customer',
                    label: 'Customer',
                    type: ui.FieldType.TEXT,
                    source: 'Document'
                });

                paySublist.addField({
                    id: 'custpage_payment',
                    label: 'Payment Id',
                    type: ui.FieldType.TEXT
                });
                paySublist.addField({
                    id: 'custpage_trandate',
                    label: 'Transaction Date',
                    type: ui.FieldType.DATE
                });

                paySublist.addField({
                    id: 'custpage_payment_batch',
                    label: 'Payment Batch',
                    type: ui.FieldType.TEXT
                });

                paySublist.addField({
                    id: 'custpage_payment_amount',
                    label: 'Amount',
                    type: ui.FieldType.CURRENCY
                });

                var revrecscheduleSearchObj = search.create({
                	   type: "revrecschedule",
                	   filters:
                	   [
                	    //  ["customer.entityid","haskeywords","FirstBLQBXLI"],
                	    //  "AND", 
                	      ["internalid","anyof","15735"]
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

                

                var myBal = revrecscheduleSearchObj.run().getRange({
                    start: 0,
                    end: 100
                });


                if (myBal) {
                    for (var i = 0; i < myBal.length ; i++) {
                        paySublist.setSublistValue({
                            id: 'custpage_select_actperiod',
                            line: i,
                            value: "F"
                        });

                        paySublist.setSublistValue({
                            id: 'custpage_customer',
                            line: i,
                            value: myBal[i].getValue({name: 'srctran',summary: 'group'})
                           
                        });

                      /*  paySublist.setSublistValue({
                            id: 'custpage_payment',
                            line: i,
                            value: myBal[i].getValue('tranid')
                        });

                        paySublist.setSublistValue({
                            id: 'custpage_payment_amount',
                            line: i,
                            value: myBal[i].getValue('amount')
                        });
                        paySublist.setSublistValue({
                            id: 'custpage_trandate',
                            line: i,
                            value: myBal[i].getValue('trandate')
                        });*/
                        /*
                        paySublist.setSublistValue({
                            id: 'custpage_payment_batch',
                            line: i,
                            value: myBal[i].getValue('custbody_jmf_otc_batch')
                        });
                        */
                    }
                    //HERE RUN THE SEARCH NOW SETT HE FIELDS
                };
                return objForm;
                //   context.response.writePage(objForm);
            }

            // ;
            return {
                onRequest: onRequest,
                createAndSubmitMapReduceJob: createAndSubmitMapReduceJob,
                showResults: showResults
            };


        });
