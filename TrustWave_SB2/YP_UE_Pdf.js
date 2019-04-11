/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @author Chelsea Fagen
 */
define(["N/file", "N/render", "N/record", "N/task","N/runtime",'N/email'],
 
   function (file, render, record, task,runtime,email) {
 
        var PDF_FOLDER = 695;         
 
        var UPDATE_INVOICE_PDFS_MAP_REDUCE_SCRIPT_ID = "customscript_yp_mr_updateinvoicepdfs";
        var UPDATE_INVOICE_PDFS_MAP_REDUCE_DEPLOYMENT_ID = "customdeploy_yp_mr_updateinvoicepdfs";
 
        /**
         * @description Creates/updates PDF invoices 
         * 
         * @param {Object} scriptContext
         * @param {record.Record} scriptContext.newRecord - New record
         * @param {record.Record} scriptContext.oldRecord - Old record
           * @param {string} scriptContext.type - Trigger type
         */
        function afterSubmit(scriptContext) {
 
            try {
 
                if (scriptContext.newRecord.type === record.Type.INVOICE) {
                     
                    invoicePdf(scriptContext);
 
                } else if (scriptContext.newRecord.type === record.Type.CUSTOMER_PAYMENT) {
            
                    updateInvoicePdf(scriptContext.newRecord.id, record.Type.CUSTOMER_PAYMENT);
 
                } else if (scriptContext.newRecord.type === record.Type.CREDIT_MEMO) {
                    
                    updateInvoicePdf(scriptContext.newRecord.id, record.Type.CREDIT_MEMO);
 
                }
 
            } catch (e) {
                 log.error("Script Error", e);
						var author = 23779;
						var recipients = ['russell.fulling@trustwave.com','LZdunczyk@trustwave.com','LDiCosola@trustwave.com','JUstianowski@trustwave.com','jscharf@yaypay.com'];
						var subject = 'Update YayPay PDF  ' + runtime.getCurrentScript().id + ' failed : ' + e;
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
 
        }
 
        return {
            afterSubmit: afterSubmit
        };
 
        /**
         * @description Deletes old PDF, creates PDF of invoice and saves to file cabinet
         * 
         * @param {Number} invoiceRecordId
         * @param {Number} invoiceRecordPdfInternalId
         */
        function createInvoice(invoiceRecordId, invoiceRecordPdfInternalId) {
 
            // Delete old invoice
            if (invoiceRecordPdfInternalId) {
 
                file.delete({
                    id: invoiceRecordPdfInternalId
                });
 
            }
 
            var pdfFile = render.transaction({
                entityId: Number(invoiceRecordId),
                printMode: render.PrintMode.PDF
            });
 
            if (!pdfFile) return;
 
            pdfFile.folder = PDF_FOLDER;
 
            var pdfFileId = pdfFile.save();
            log.debug("pdfFileId", pdfFileId);
 
            record.submitFields({
                type: record.Type.INVOICE,
                id: invoiceRecordId,
                values: {
                    custbody_yp_pdf: pdfFileId
                }
            });
 
        }
 
       /**
        * @description Calls map/reduce script that updates invoice PDFs
        * 
        * @param {Number} originRecordId
        * @param {String} originRecordType
        */
        function updateInvoicePdf(originRecordId, originRecordType) {
 
            var updateInvoicePdfsMapReduceTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: UPDATE_INVOICE_PDFS_MAP_REDUCE_SCRIPT_ID,
                deploymentId: UPDATE_INVOICE_PDFS_MAP_REDUCE_DEPLOYMENT_ID,
                params: {
                    "custscript_yp_originrecordid": originRecordId,
                    "custscript_yp_originrecordtype": originRecordType
                }
            });
 
            var updateInvoicePdfsMapReduceTaskId = updateInvoicePdfsMapReduceTask.submit();
            log.debug("updateInvoicePdfsMapReduceTaskId", updateInvoicePdfsMapReduceTaskId);
 
        }
 
        /**
         * @description Gets information to create PDF from an invoice record
         * 
         * @param {Object} scriptContext
         */
        function invoicePdf(scriptContext) {
 
            var invoiceRecord = scriptContext.newRecord;
 
            if (!invoiceRecord) return;
 
            var invoiceRecordStatusRef = invoiceRecord.getValue({
                fieldId: "statusRef"
            });
 
            // If invoice is already paid do not save PDF
            if (invoiceRecordStatusRef === "paidInFull") return;
 
            var invoiceRecordId = invoiceRecord.id;
 
            var invoiceRecordPdfInternalId = invoiceRecord.getValue({
                fieldId: "custbody_yp_pdf"
            });
 
            createInvoice(invoiceRecordId, invoiceRecordPdfInternalId);
 
        }
 
    });