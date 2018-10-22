/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        12 Dec 2017     Rfulling
 *
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/record','N/error','N/runtime','N/email','N/file'], 
		function (search, record, error, runtime, email, file) {
    /*
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);

        var author = -5;
        var recipients = 'russell@totalwarehouse.com';
        var subject = 'Mass Update Script   ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +'Error code: ' + e.name + '\n' + 'Error msg: ' + e.message;
        email.send({author: author,recipients: recipients,subject: subject,body: body});
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            var e = error.create({name: 'INPUT_STAGE_FAILED',message: inputSummary.error});
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            var msg = 'Failure to update Transaction id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0) {
            var e = error.create({
                name: 'RECORD_UPDATE_FAILED',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function createSummaryRecord(summary) {
        var reduceSummary = summary.reduceSummary;
        var contents = '';
        summary.output.iterator().each(function (key, value) {
            contents += (key + ' ' + value + '\n');
            //todo create custom record if you wan to record the usage and performance. 
            //log.debug('in the each ', contents);
            //return true;
        });

        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;

        }

        catch (e) {
            handleErrorAndSendNotification(e, 'summarize');
        }
    }

    function getInputData() {
        
    	var scriptObj = runtime.getCurrentScript();
        var arrChildId =[];
        var arrChildAssestId =[];
        arrAsset = JSON.parse(scriptObj.getParameter({name: 'custscript_assets_to_process'}));
        log.debug('Assets passed in ', arrAsset);
       
      
        var assetChildSearch = search.create({
			type: 'customrecord_bsg_asset_card',
			filters:[
					['custrecord_bsg_asset_parent','anyof', arrAsset]
					],
			columns:['custrecord_bsg_asset_item',
                      'custrecord_bsg_asset_sell_price',
                      'custrecord_bsg_asset_serial',
                      'custrecord_bsg_asset_inventory_location'
				    ]
		});
        log.debug('ChildAssets ', assetChildSearch);
        return assetChildSearch;
     }

     
     /* Executes when the map entry point is triggered and applies to each key/value pair.
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */

  /*  
    function map(context) {
   
       var data = JSON.parse(context.value);
       var serialNumber  = data.values.custrecord_bsg_asset_serial;
       var itemId = data.values.custrecord_bsg_asset_item;      
       context.write({key: context.key , value : data });
    }
    */
    
    function reduce(context) {
    	//Here will just be an group of item Id's to be added to the sales order
    	log.debug('reduce  ' , context);
    	var arrContext = [];
    	var contextValues =JSON.stringify(context.values[0]);
    	var scriptObj = runtime.getCurrentScript();
		var soId = scriptObj.getParameter({name: 'custscript_so_id'});
    	
		 contextValues=contextValues.replace(/(\r\n\t|\n|\r\t)/gm,"");
         arrContext = JSON.parse(contextValues);
         arrContext=JSON.parse(arrContext);
        
	        var myLines = context.values.length;
	        var serialNumber = (arrContext.values.custrecord_bsg_asset_serial).toString();
	        var searchRelatedItem = (arrContext.values.custrecord_bsg_asset_item.text).trim();
	        var insertItemId=parseInt(arrContext.values.custrecord_bsg_asset_item.value);
	        var invLocation=parseInt(arrContext.values.custrecord_bsg_asset_inventory_location.value);
	      
	        log.debug('Serial is  ' , serialNumber);
	        log.debug('Item is  ' , searchRelatedItem);
	        log.debug('Inv Loc is ', invLocation);
       
           var serialNumberSearch = search.create({type: record.Type.INVENTORY_NUMBER,
        	   filters: [
						['inventorynumber','is', serialNumber] , 'and', ['item', 'is', searchRelatedItem],
						'and', ['location','anyof', invLocation]
					    ],
					columns: ['internalid'],
					         
				});
		       var arrSerial = serialNumberSearch.run().getRange({start: 0,end: 10});
               log.debug('item  serial search  ' ,arrSerial);
               if(arrSerial[0]){
		     			  var serialId = parseInt(arrSerial[0].getValue('internalid'));
		     			  var soRec =record.load({type: record.Type.SALES_ORDER,id : parseInt(soId),isDynamic : true});
						   soRec.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: parseInt(insertItemId)});
						   soRec.setCurrentSublistValue({sublistId: 'item',fieldId:'price',value: -1});
						   soRec.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: 1});
						   soRec.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: 0});
						   soRec.setCurrentSublistValue({sublistId: 'item',fieldId: 'location',value: invLocation});
					   
						   		var subrec = soRec.getCurrentSublistSubrecord({sublistId: 'item',fieldId: 'inventorydetail'});
						   		subrec.selectNewLine({sublistId: 'inventoryassignment'});
						   		subrec.setCurrentSublistValue({sublistId: 'inventoryassignment',fieldId: 'quantity',value: 1});
						   		subrec.setCurrentSublistValue({sublistId: 'inventoryassignment',fieldId: 'issueinventorynumber',value: parseInt(serialId)});
						   		subrec.commitLine({sublistId: 'inventoryassignment'});
						   		soRec.commitLine({sublistId:'item'});
					   soRec.save();
		       		}
						//we can create the IF here but on the save do not re-execut the map reduce.
					   //   var objRecord = record.transform({fromType: record.Type.SALES_ORDER,fromId: parseInt(soId),toType: record.Type.ITEM_FULFILLMENT,isDynamic: true,});
					   //   objRecord.save();
    }
   
    function summarize(summary) {
        handleErrorIfAny(summary);
        createSummaryRecord(summary);
    }

    return {
        getInputData: getInputData,
       // map: map,
        reduce: reduce,
        summarize: summarize
    };

});
