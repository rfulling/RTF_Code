/**
 * bsg_message_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
*/
define(['N/record','N/search','N/render','N/file','N/runtime','N/ui/serverWidget'],
	function(record, search, render, file, runtime,serverWidget){
		function beforeLoad(context){
			var nrec = context.newRecord;
			var form = context.form;
			var curScript = runtime.getCurrentScript();
			var workOrderForm = curScript.getParameter({name:'custscript_bsg_message_workorder'});
            var entity =nrec.getValue({fieldId:'entity'});
            var thisTrans = nrec.getValue({fieldId: 'transaction'});

			//log.debug('what is the entity ', nrec.getValue({fieldId:'entity'}));
		    log.debug('what is the transaction ', thisTrans);
		    /*
			form.addField({
				id: 'custpage_include_service_pdf',
				label: 'Include Service Report',
				type: 'checkbox',
				container: 'attachments'
			});
			*/
			var sublist = form.addSublist({
			    id : 'custpage_sublist',
			    type : serverWidget.SublistType.LIST,
			    label : 'Transactions',
			    tab: 'attachments'
			});

			//here add the sublist fields
			var invId=	sublist.addField({
			    id : 'custpage_intid',
			    type  :serverWidget.FieldType.INTEGER,
			    label : 'Id',
			    tab: 'attachments'
			 });
			invId.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

			sublist.addField({
			    id : 'custpage_stat',
			    type :serverWidget.FieldType.TEXT,
			    label : 'Status'
			 });

			sublist.addField({
			    id : 'custpage_tranid',
			    type : serverWidget.FieldType.TEXT,
			    label : 'Document'
			 });

			sublist.addField({
			    id : 'custpage_amt',
			    type : serverWidget.FieldType.CURRENCY,
			    label : 'Amount'
			 });

			sublist.addField({
			    id : 'custpage_d',
			    type : serverWidget.FieldType.DATE,
			    label : 'Date'
			 });

			sublist.addField({
			    id : 'custpage_cb',
			    type : serverWidget.FieldType.CHECKBOX,
			    label : 'Attach'
			 });
			sublist.addField({
			    id : 'custpage_fso',
			    type : serverWidget.FieldType.INTEGER,
			    label : 'Asset Id '
			 });
			sublist.addField({
			    id : 'custpage_created_from',
			    type : serverWidget.FieldType.INTEGER,
			    label : 'SO ID '
			 });
			sublist.addField({
			    id : 'custpage_createdfrom_text',
			    type : serverWidget.FieldType.TEXT,
			    label : 'SO ID '
			 });
			sublist.addField({
			    id : 'custpage_trantype_text',
			    type : serverWidget.FieldType.TEXT,
			    label : 'Transaction Type'
			 });


			var searchToRun='customsearch_bjh_email_transaction';
			var tranSearch = search.load({ id: searchToRun });
			var searchFilter = search.createFilter({
				name: 'internalid',
				join: 'customer',
				operator: search.Operator.ANYOF,
				values: entity
			});

			var assetID = search.createColumn({
				name: 'custbody_bsg_asset_card',
				join: 'createdfrom'
			});

			tranSearch.filters.push(searchFilter);
			tranSearch.columns.push(assetID);

			var arrInv = tranSearch.run().getRange({start: 0, end: 500});
			// log.debug('SearchResult ', arrInv);

			if (arrInv) {
				for (var i = 0; i < arrInv.length; i++) {
					sublist.setSublistValue({
						id: 'custpage_intid',
						line: i,
						value: arrInv[i].getValue('internalid')
					});

					if (arrInv[i].getText('statusref')) {
						sublist.setSublistValue({
							id: 'custpage_stat',
							line: i,
							value: arrInv[i].getText('statusref')
						});
					}
					sublist.setSublistValue({
						id: 'custpage_tranid',
						line: i,
						value: arrInv[i].getValue('transactionname')
					});
					sublist.setSublistValue({
						id: 'custpage_amt',
						line: i,
						value: arrInv[i].getValue('amount')
					});
					sublist.setSublistValue({
						id: 'custpage_d',
						line: i,
						value: arrInv[i].getValue('trandate')
					});

					if (arrInv[i].getValue(assetID)) {
						sublist.setSublistValue({
							id: 'custpage_fso',
							line: i,
							value: arrInv[i].getValue(assetID)
						});
					};

					if (arrInv[i].getValue('createdfrom')) {
						sublist.setSublistValue({
							id: 'custpage_created_from',
							line: i,
							value: arrInv[i].getValue('createdfrom')
						});

						sublist.setSublistValue({
							id: 'custpage_createdfrom_text',
							line: i,
							value: arrInv[i].getText('createdfrom')
						});
					}
					sublist.setSublistValue({
						id: 'custpage_trantype_text',
						line: i,
						value: arrInv[i].recordType
					});
				}
			}
		}

		function beforeSubmit(context){
			var nrec = context.newRecord;
			var form = context.form;
			var curScript = runtime.getCurrentScript();
			var workOrderFormId = curScript.getParameter({name:'custscript_bsg_message_workorder'});
			var pdfTemplateFileId = curScript.getParameter({name:'custscript_bsg_message_pdf_template'});
			var pdfStorageFolderId = curScript.getParameter({name:'custscript_bsg_message_pdf_folder'});
            var transId = nrec.getValue({fieldId: 'transaction'});
			var includeCurrentTransaction = nrec.getValue({fieldId: 'includetransaction'});

			//Include the current transaction
			if (transId && includeCurrentTransaction == 'T') {
				// log.debug('include current transaction first ', transId);
				//set the field to false and do a custom print
				nrec.setValue({fieldId: 'includetransaction', value: false})

				//send the current invoice
				var transactionSearch = search.lookupFields({
					type: 'transaction',
					id: transId,
					columns: ['createdfrom', 'createdfrom.customform', 'createdfrom.custbody_bsg_asset_card', 'createdfrom.name', 'type', 'tranid']
				});


				var soId = transactionSearch.createdfrom[0] ? transactionSearch.createdfrom[0].value : '';
				log.debug({title:'SOID', details: soId});

				if(transactionSearch){
					var transType = transactionSearch.type[0] ? transactionSearch.type[0].value : '';
					var transText = '';

					log.debug({title: 'transType', details: transType});
					switch (transType) {
						case 'CustInvc':
							transType = 'invoice';
							transText = 'Invoice';
							break;
						case 'SalesOrd':
							transType = 'salesorder';
							transText = 'Sales Order';
							break;
						case 'CustCred':
							transType = 'creditmemo';
							transText = 'Credit Memo';
							break;
					}

					var docNum = transText + ' #' +transactionSearch.tranid;

					//if there is an asset the print the special invoice else print the standard invoice
					if (transactionSearch['createdfrom.custbody_bsg_asset_card'][0] && transType == 'invoice') {
						var currentAssetId = transactionSearch['createdfrom.custbody_bsg_asset_card'][0].value;

						log.debug('what created from asset card  ', transactionSearch['createdfrom.custbody_bsg_asset_card'][0].value);
						log.debug('what SO id   ', transactionSearch.createdfrom[0].value);
						log.debug('what SO Text   ', transactionSearch.createdfrom[0].text);
						log.debug('what is the trans type ', transactionSearch.type[0].value);
						printServiceInvoice(context, transId, currentAssetId, soId, pdfTemplateFileId, pdfStorageFolderId, docNum, transType);
					} else {
						printStandardInvoice(context, transId, docNum, transType);
					}
				}
			}
			//var lineCount = custpage_sublist.lineCount;
			var objSublist = nrec.getSublist({sublistId: 'custpage_sublist'});
			var numLines = nrec.getLineCount({sublistId: 'custpage_sublist'});

			//loop through each line if it is selected add the invoice to the renderer
			 for (var i = 0; i < numLines; i++) {
				 var isSelected = nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_cb',line: i});
				 var recInteral = nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_intid',line: i});
				 var assetID = nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_fso',line: i});
				 var soId =nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_created_from',line: i});
				 var createdFromText =nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_createdfrom_text',line: i});
				 var transType =nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_trantype_text',line: i});
				 var tranid =nrec.getSublistValue({sublistId: 'custpage_sublist', fieldId: 'custpage_tranid',line: i});

				// log.debug('Selected ', isSelected+ ' Invice '+recInteral +' Asset '+assetID );
			    //IF selected send the three ids to the print function

				 if(isSelected=='T' && transType =='invoice' && assetID ){
					 //print the invoice
					printServiceInvoice(context, recInteral, assetID, soId, pdfTemplateFileId, pdfStorageFolderId, createdFromText, transType);
				 }
				 if(isSelected=='T' && transType =='invoice'&& !assetID){
					 printStandardInvoice(context,recInteral,tranid,'INV');
				 }

				 if(isSelected=='T' && transType =='salesorder'){
					 //print the invoice
					 printStandardInvoice(context,recInteral,transType,'Sales Order');
				 }

				 if(isSelected=='T' && transType =='creditmemo'){
					 printStandardInvoice(context,recInteral,tranid,'Credit Memo');
				 }

			 }
		}
         function printServiceInvoice(context,transId,assetId,createdFrom,pdfTemplateFileId,pdfStorageFolderId,createdFromText,transType){
		  // try{
			   var nrec = context.newRecord;
				//Get Sales Order Reference
                //todo load regular template if not AssetId
	    	   log.debug('here is the transId ' , transId)
	    	   log.debug('here is the transType ' , transType)

	    	   transType = transType.trim();
	    	   var invRec = record.load({type:transType,id:transId});
			  //Load template and populate with record
	    	   log.debug('transaction Loaded ', invRec);

	    	    var templateFile = file.load({id:pdfTemplateFileId});
				var renderer = render.create();
				renderer.templateContent = templateFile.getContents();
				renderer.addRecord({templateName:'record',record:invRec});


				//Get signatures on Service invoices
				if(createdFrom){
					var templateFile = file.load({id:pdfTemplateFileId});

					var signatureSearch = search.create({
						type: 'customrecord_bsg_signature_capture',
						filters: [
							['custrecord_bsg_signature_work_order','is', createdFrom]
						],
						columns: ['custrecord_bsg_signature_signed_by','custrecord_bsg_signature_url']
					});
					var signatureRes = signatureSearch.run().getRange({start:0, end:20});
					log.debug('signature ', signatureRes);

					renderer.addSearchResults({templateName:'signature',searchResult:signatureRes});

					invRec.setValue({fieldId:'custbody_bsg_service_checklist_html',value:buildServiceChecklist(invRec)});
				//log.debug({title:'SVC CHECKLIST',details:invRec.getValue({fieldId:'custbody_bsg_service_checklist_html'})});
				}
				//Create PDF
				var servicePDF = renderer.renderAsPdf();
				//servicePDF.name = 'SR2.0 -'+ transactionSearch.createdfrom[0].text+'.pdf';
				servicePDF.name = 'SR2.0 - '+ createdFromText +'.pdf';
				servicePDF.folder = pdfStorageFolderId;
				var servicePDFId = servicePDF.save();

				//Add File To Attachments On Message
				nrec.setSublistValue({sublistId:'mediaitem',fieldId:'mediaitem',line:nrec.getLineCount({sublistId:'mediaitem'}),value:servicePDFId});

	      //}catch(e){
			//	log.error({title:'FAILED TO ATTACH SERVICE PDF',details:e.message});
			//}
		}


		function printSalesOrder(context,transId,transType,tranid){

			log.debug('printStandardSalesOrder', transId);
			var nrec = context.newRecord;
			var transactionFile = render.transaction({
			    entityId: parseInt(transId),
			    printMode: render.PrintMode.PDF,
			    inCustLocale: true
			    });

			transactionFile.name='SO-'+tranid +'.pdf';
			transactionFile.folder=2572;
			 var tranID = transactionFile.save();
			nrec.setSublistValue({sublistId:'mediaitem',fieldId:'mediaitem',line:nrec.getLineCount({sublistId:'mediaitem'}),value:tranID});

		}

		function printStandardInvoice(context, invID,tranid,NM){

			log.debug('printStandardInvoice', invID);
			var nrec = context.newRecord;
			var transactionFile = render.transaction({
			    entityId: parseInt(invID),
			    printMode: render.PrintMode.PDF,
			    inCustLocale: true
			    });

			transactionFile.name=NM+'- '+tranid +'.pdf';
			transactionFile.folder=2572;
			 var tranID = transactionFile.save();
			nrec.setSublistValue({sublistId:'mediaitem',fieldId:'mediaitem',line:nrec.getLineCount({sublistId:'mediaitem'}),value:tranID});

		}

		function buildServiceChecklist(nrec){
			var serviceChecklistHtml = '';
			//Build Service Checklist HTML
			var boxChecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_checked.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxUnchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_empty.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxXchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_x.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';

			svcChecklist = nrec.getValue({fieldId:'custbody_bsg_service_order_checklist'});
			if (svcChecklist) {
				try{
					svcChecklist = JSON.parse(svcChecklist);
				}catch(e){
					svcChecklist = {checklist_items:[], checklist_images:[]};
				}

				if (svcChecklist.checklist_items && svcChecklist.checklist_items.length) {
					serviceChecklistHtml = '<table style="width:100%;border:1px solid black"><tr></tr><tr>';
					for (var i = 0; i < svcChecklist.checklist_items.length; i++) {
						var checked = (svcChecklist.checklist_items[i].checked);
						if (i % 3 === 0 && i > 0) {
							serviceChecklistHtml += '</tr><tr>';
						}

						switch (checked) {
							case true:
								serviceChecklistHtml += boxChecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								break;
							case null:
							case false:
								if (checked === false) {
									serviceChecklistHtml += boxXchecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								} else {
									serviceChecklistHtml += boxUnchecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								}
								break;
							default:
								break;
						}
					}
					serviceChecklistHtml += '</tr></table>';
				}
			}
			return serviceChecklistHtml;
		}

		return {
			beforeLoad: beforeLoad,
			beforeSubmit: beforeSubmit
		}
	}
);