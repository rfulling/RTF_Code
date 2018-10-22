/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {

    	var scriptObj = scriptContext.getCurrentScript();
        var arrAsset =[];
        var arrUpdateSO = [];
        arrAsset = JSON.parse(scriptObj.getParameter({name: 'custscript_assets_to_process_ss'}));
    	var soId = scriptObj.getParameter({name: 'custscript_so_id_ss'});
    	
        //get ChildAssets
        var arrUpdateSO = [];
        var assetChildSearch = search.create({type: 'customrecord_bsg_asset_card',
        						filters: [
        						['custrecord_bsg_asset_parent', 'anyof', arrAssetId]
        						],
							    columns: ['custrecord_bsg_asset_item',
							              'custrecord_bsg_asset_sell_price',
							              'custrecord_bsg_asset_serial',
							              'custrecord_bsg_asset_inventory_location'
							              ]
							    });
			  
        var arrChildren = assetChildSearch.run().getRange({start: 0,end: 10});
        for (var a = 0; a < arrChildren.length; a++) {
            var itemId = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_item' });
            var itemSerial = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_serial' });
            var invLocation = arrChildren[a].getValue({ name: 'custrecord_bsg_asset_inventory_location' });
            var invDetail = getInvDetail(itemId, invLocation, itemSerial);

            arrUpdateSO.push({'itemId': itemId, 'invDetail': invDetail, 'invLocation': invLocation} );
         }
        updateSo(arrUpdateSO);
    	
    }
    
    function getInvDetail(searchRelatedItem, invLocation, serialNumber) {
         var serialNumberSearch = search.create({type: record.Type.INVENTORY_NUMBER,
            								   filters: [
            							       ['inventorynumber', 'is', serialNumber], 'and', ['item', 'is', searchRelatedItem],
            							      'and', ['location', 'anyof', invLocation]
            							       ],
            							       columns: ['internalid']

        								    	});		
        var arrSerial = serialNumberSearch.run().getRange({ start: 0, end: 10 });
        return parseInt(arrSerial[0].getValue('internalid'));;
    }
    
    function updateSo(arrUpdateSo) {
        var soRec = record.load({ type: record.Type.SALES_ORDER, id: 72312, isDynamic: true });
       
           for (var a = 0; a < arrUpdateSo.length; a++) {
            var lineNum = soRec.selectNewLine('item');

            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item',  value: parseInt(arrUpdateSo[a].itemId) });

            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1 });
            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 0 });
            soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: parseInt(arrUpdateSo[a].invLocation) });

            var subrec = soRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
            subrec.selectNewLine({ sublistId: 'inventoryassignment' });
            subrec.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
            subrec.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: parseInt(arrUpdateSo[a].invDetail) });
            subrec.commitLine({ sublistId: 'inventoryassignment' });
            soRec.commitLine({ sublistId: 'item' });
            }

       soRec.save();

    }

    return {
        execute: execute
    };
    
});
