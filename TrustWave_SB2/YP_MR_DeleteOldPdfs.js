/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @author Chelsea Fagen, RSM
 */

define(["N/file", "N/search"],
    function (file, search) {

        /**
         * @description Acquires a collection of data
         * 
           * @returns Array | Object | search.Search | mapReduce.ObjectRef | file.File Object
         */
          function getInputData() {
            try {

                // Get all invoices that were paid three days ago
                var paidInvoiceSearch = search.create({
                    type: search.Type.INVOICE,
                    filters: [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["systemnotes.type", "is", "F"],
                        "AND",
                        ["systemnotes.newvalue", "contains", "Paid"],
                        "AND",
                        ["systemnotes.date", "on", "threedaysago"],
                        "AND",
                        ["systemnotes.field", "anyof", "TRANDOC.KSTATUS"],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                    columns: [
                        search.createColumn({ name: "custbody_yp_pdf", label: "PDF" })
                    ]
                });

                log.debug("paidInvoiceSearch", paidInvoiceSearch);
                return paidInvoiceSearch;
                
            } catch (e) {
                log.error("Script Error", e);
            }

        }

        /**
         * @description Parses each row of data into a key/value pair
         * One key/value pair is passed per function invocation 
         * 
         * @param {*} context 
         */
        function map(context) {
            log.debug("enter map context", context);

            try {

                if (!context || !context.value) return;
                var paidInvoiceSearch = JSON.parse(context.value);
                log.debug("paidInvoiceSearch map", paidInvoiceSearch);

                var pdfInvoiceId = paidInvoiceSearch.values.custbody_yp_pdf;
                if (!pdfInvoiceId) return;
                log.debug("pdfInvoiceId", pdfInvoiceId);
                file.delete({
                    id: pdfInvoiceId
                });
                
            } catch (e) {
                log.error("Script Error", e);
            }

            log.debug("exit map context", context);
        }


        /**
         * @description Summarizes the output of the previous stages
         * Used summarize the data from the entire map/reduce process and write it to a file or send an email
         * This stage is optional
         * 
         * @param {*} summary 
         */
        function summarize(summary) {
            var type = summary.toString();
            log.debug(type + ' Usage Consumed', summary.usage);
            log.debug(type + ' Number of Queues', summary.concurrency);
            log.debug(type + ' Number of Yields', summary.yields);
        }
        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };

});