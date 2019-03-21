/**
 * bsg_asset_item_fulfillment_ue.js
 * 
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define([ 'N/record' ], function(record) {
	function beforeSubmit(context) {
	}

	function afterSubmit(context) {
		rec = context.oldRecord;
		var newRec = context.newRecord;

		var itemType = rec.type;
		var extId = rec.getValue({
			fieldId : 'externalid'
		});
		var newExtId = newRec.getValue({
			fieldId : 'custitem1'
		});

		if (!newExtId) {
			newExtId = rec.id;
		}

		if (newExtId != extId) {
			record.submitFields({
				type : itemType,
				id : rec.id,
				values : {
					'externalid' : newExtId
				}
			});
		}

		var newext = rec.getValue({
			fieldId : 'externalid'
		});
		log.debug('rec id', rec.id)
	}
	return {
		beforeSubmit : beforeSubmit,
		afterSubmit : afterSubmit
	};
});