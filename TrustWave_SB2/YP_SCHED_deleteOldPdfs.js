/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * @author Chelsea Fagen, RSM
 */
define(["N/file", "N/search"],
    
    function( file, search) {
       
        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         */
        function execute(scriptContext) {

            // Get all invoices that were paid three days ago
            var paidInvoiceSearch = search.create({
                type: search.Type.INVOICE,
                  filters:[
                    ["type","anyof","CustInvc"], 
                    "AND", 
                    ["systemnotes.type","is","F"], 
                    "AND", 
                    ["systemnotes.newvalue","contains","Paid"], 
                    "AND", 
                    ["systemnotes.date","on","threedaysago"], 
                    "AND", 
                    ["systemnotes.field","anyof","TRANDOC.KSTATUS"], 
                    "AND", 
                    ["mainline","is","T"]
                ],
                columns:[
                    search.createColumn({name: "custbody_yp_pdf", label: "PDF"})
                ]
            });
            log.debug("Search count", paidInvoiceSearch.runPaged().count);

            // Delete invoice PDFs that were paid three days ago
            paidInvoiceSearch.run().each(function(result){
                log.debug(result);
                
                var pdfInvoiceId = result.getValue({
                    name: "custbody_yp_pdf"
                });
              
              if(!pdfInvoiceId) return true;

                log.debug("pdfInvoiceId", pdfInvoiceId);

                file.delete({
                    id: pdfInvoiceId
                });
                
                return true;
            });
    
        }
    
        return {
            execute: execute
        };
        
    });
