/**
 * bsg_message_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
*/
define(['N/record','N/search','N/render','N/file','N/runtime','N/ui/serverWidget'],
	function(record, search, render, file, runtime,serverWidget){
		function beforeLoad(context){}

		function beforeSubmit(context){
			var nrec = context.newRecord;
			var form = context.form;
			var dealType = nrec.getValue({fieldId: 'custbody_deal_type'});
			
			if(dealType==355){
			var numLines = nrec.getLineCount({sublistId: 'item'});

			//loop through each line if it is selected add the invoice to the renderer
			 for (var i = 0; i < numLines; i++) {
				 
				 nrec.setSublistValue({sublistId: 'item', 
					                   fieldId: 'class',
					                   line: i,
					                   value: 355 });
				 
			 }
		   }
		}
         
		function printServiceInvoice(context,transId,assetId,createdFrom,pdfTemplateFileId,pdfStorageFolderId,createdFromText,transType){}
		function printSalesOrder(context,transId,transType,tranid){}
		function printStandardInvoice(context, invID,tranid,NM){}
		function buildServiceChecklist(nrec){}
		
		return {
			//beforeLoad: beforeLoad,
			beforeSubmit: beforeSubmit
		}
	}
);