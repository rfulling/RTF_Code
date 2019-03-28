/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/error', 'N/format', 'N/http', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/xml','N/file','N/render'],
/**
 * @param {email} email
 * @param {error} error
 * @param {format} format
 * @param {http} http
 * @param {https} https
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {xml} xml
 */
function(email, error, format, http, https, record, runtime, search, xml, file, render) {
   
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
    function getInputData() {
    	//call the URL and get the data
    	var invoice_filter = "";
    	var scriptObj = runtime.getCurrentScript();
    	var param_url =  scriptObj.getParameter({name: 'custscript_coupa_inv_url_20'});
    	var param_APIKey = scriptObj.getParameter({name: 'custscript_coupa_inv_apikey_20'});
    	var renderer = render.create();
    	
    	//Build out the url 
    	if (scriptObj.getParameter({name: 'custscript_coupa_invoice_filter'})) {
    		invoice_filter = scriptObj.getParameter({name: 'custscript_coupa_invoice_filter'});
    	}
    	var url = param_url + '/api/invoices?exported=false&status=approved'
    	var headers = new Array();
    	headers['ACCEPT'] = 'text/xml';
    	headers['X-COUPA-API-KEY'] = param_APIKey;
    	var response = '';
    	
    	//response = nlapiRequestURL(url, null, headers);
    	log.debug('url ' ,url);
    	
    	var response = https.get({
            url: url,
            headers: headers
         });
    	  	
    	var xmlDocument=response.body;
    	
    	if (response.code == '200') {
    		var responseXML = xmlDocument;
    		log.debug({titls: 'XML is ', details: responseXML});
    		
    		
    	}
    	
    	
//      log.debug({title: 'XMLdOCUMENT',    details:xmlDocument  });
       
        var fileObj = file.create({
            name    : 'test.xml',
            fileType: file.Type.XMLDOC,
            contents: xmlDocument
            });
        
        fileObj.folder = 25257;
        var fileId = fileObj.save();
        
  	return;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
