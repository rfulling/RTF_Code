/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @author Chelsea Fagen, RSM
 */
 
    define(["N/record", "N/render", "N/search"], function( record, render, search){
 
        var PDF_FOLDER = 25257;
 
        /**
         * @description Acquires a collection of data
         * 
         * @returns Array | Object | search.Search | mapReduce.ObjectRef | file.File Object
         */
         function getInputData(){
 
            try{
           
             
              var openInvoiceSearch = search.create({
   type: "invoice",
   filters:
   [
        ["type","anyof","CustInvc"], 
      "AND", 
      ["mainline","is","T"], 
         "AND", 
      ["memorized","is","F"], 
     "AND", 
       ["custbody_yp_pdf","isempty",""], 
      "AND", 
       ["status","anyof","CustInvc:A"] 
     // ,"AND", 
     // ["internalid","anyof","2079166"]
   ],
                    columns:
                    [
                        "custbody_yp_pdf", 
                        "entity"
                    ]
                });
 
            }catch(e){
                log.error("Script Error", e);
            }
 
            log.debug("openInvoiceSearch", openInvoiceSearch);
            return openInvoiceSearch;
        }
     
        /**
         * @description Parses each row of data into a key/value pair
         * One key/value pair is passed per function invocation 
         * 
         * @param {*} context 
         */
        function map(context){
            log.debug("enter map context", context);
             try{
 
                if(!context || !context.value) return;
                var openInvoiceSearch = JSON.parse( context.value);
                 
                var pdfFile = render.transaction({
                    entityId: Number(openInvoiceSearch.id),
                    printMode: render.PrintMode.PDF
                });
                 pdfFile.folder = PDF_FOLDER;
                 var pdfFileId = pdfFile.save();
                 var customerId = openInvoiceSearch.values.entity.value;
               
               openInvoiceSearch.values.custbody_yp_pdf = pdfFileId;
               context.write({
                    key: customerId,
                    value: openInvoiceSearch
                });
             
            }catch(e){
                log.error("Script Error", e);
            }
 
            log.debug("exit map context", context);
     
        }
     
        /**
         * @description Evaluates the data in each group 
         * One group (key/value) is passed per function invocation 
         * 
         * @param {*} context 
         */
        function reduce(context){
            log.debug("enter reduce context", context);
 
            try{
            	
              //  var openInvoiceSearch = JSON.parse(context.value);             
                var pdfFile = render.transaction({
                    entityId: Number(context.key),
                    printMode: render.PrintMode.PDF
                });
                 pdfFile.folder = PDF_FOLDER;
                 var pdfFileId = pdfFile.save();
 
                   log.debug('what is the pdfid ',pdfFileId );
                   
                   record.submitFields({
                        type: record.Type.INVOICE,
                        id: Number(context.key), 
                        values: {
                            custbody_yp_pdf: pdfFileId
                        }
                    });
 
             
             
            }catch(e){
                log.error("Script Error", e);
            }
 
            log.debug("exit reduce context", context);
        } 
     
     
        /**
         * @description Summarizes the output of the previous stages
         * Used summarize the data from the entire map/reduce process and write it to a file or send an email
         * This stage is optional
         * 
         * @param {*} summary 
         */
        function summarize(summary){
            var type = summary.toString();
            log.debug(type + ' Usage Consumed', summary.usage);
            log.debug(type + ' Number of Queues', summary.concurrency);
            log.debug(type + ' Number of Yields', summary.yields);
        }
        return {
            getInputData: getInputData,
            //map: map,
            reduce: reduce,
            summarize: summarize
        };
     
    });