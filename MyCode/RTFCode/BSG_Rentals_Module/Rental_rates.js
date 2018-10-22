/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/render', 'N/search', 'N/task'],
/**
 * @param {record} record
 * @param {render} render
 * @param {search} search
 * @param {task} task
 */
function(record, render, search, task) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
    	
    	//check for rental rates for this item 
    	var nrec =scriptContext.newRecod;
    	var itemId = parseInt(nrec.getValue({fieldId: 'custrecord_bsg_asset_item'}));
        var assetType = nrec.getText({fieldId: 'custrecord_bsg_asset_type'});
    	//search for rental rates 
    	if(assetType=='Available for Rent'){
		        var retalRateSearch = search.create({
		 			type: 'customrecord_bsg_rental_item_rates',
		 			filters:[
		 		
		 					['custrecord_bsg_rental_item_rates_item','anyof', itemId]
		 					],
		 			columns:['custrecord_bsg_rental_item_rates_rate',
		                       'custrecord_bsg_rental_item_rates_cat'
		 				    ]
		 		});
		        var arrRates = getCreatedFromPO.run().getRange({start: 0,end: 10});
		        var rentalRate = arrRates.custrecord_bsg_rental_item_rates_rate[0] ? transactionSearch.custrecord_bsg_rental_item_rates_rate[0].value : '';
		        var rentalRateCat = arrRates.custrecord_bsg_rental_item_rates_cat[0] ? transactionSearch.custrecord_bsg_rental_item_rates_cat[0].value : '';
    	}
    	//var update the rental Rates by createing a new record 
    	
     var assetRate =  record.create({
    		type: 'customrecord_bsg_rental_asset_rates',
    		 isDynamic: true
    	});
     
     assetRate.setValue({fieldId:'custrecord_bsg_rental_asset_rates_cat',value: rentalRateCat});
     assetRate.setValue({fieldId:'custrecord_bsg_rental_asset_rates_rate',value: rentalRate});
     assetRate.save();
     
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	/*var jSparam = [{"recordType":"customrecord_bsg_asset_card","id":"34003","values":{"custrecord_bsg_asset_status":[{"value":"6","text":"Available for Sale"}],"name":"WPT-45 27X48 327130231","custrecord_bsg_flow_status":[{"value":"6","text":"03 Pending Delivery"}]}}]
    	
    	
    	var mapReduce = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: 'customscript_xtest_mr',
            deploymentId: 'customdeploy_test',
            params: { custscriptrtf:jSparam,
                custscriptsoid:72312 }
        });
		    var mrID = mapReduce.submit();*/
    	
    	
    	
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
