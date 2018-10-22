/**
 * render a pdf format report depedent on parameters.
 * @exports bjl/work-order-report
 * @copyright 2017 BSA Consulting
 * @author NASH BERNARDO & CHRISTIAN D. GUMERA
 * Format: https://system.na2.netsuite.com/app/common/media/mediaitem.nl?id=2392
 * @NApiVersion 2.x
 * @NScriptType Suitelet
*/
define(['N/record', 'N/render', 'N/search', 'N/file'], function (record, render, search, file) {
	var exports = {};

	/**
	 * <code>onRequest</code>
	 *
	 * @param {Object} context
	 * @param {Request Parameter} context.request.parameters.compid company id.
	 * @param {Request Parameter} context.request.parameters.recordtype recordtype.
	 * @param {Request Parameter} context.request.parameters.recordId record id.
	 *
	 * @return {void}
	 *
	 * @static
	 * @function onRequest
	 */

	function onRequest(context){
        
        var companyId = context.request.parameters.compid;
        var recordtype = context.request.parameters.recordtype;
        var recordId = context.request.parameters.recordId;

        var salesorder = record.load({
            type: recordtype,
            id: recordId
        });

		var workOrderPdf = renderWorkOrderReport(salesorder);

		context.response.writeFile({
			file: workOrderPdf,
			isInline: true
		});
	}

    function renderWorkOrderReport(salesorder){
		var template = file.load(2392);
		var renderer = render.create();
		renderer.templateContent = template.getContents();
		renderer.addRecord({
			templateName: 'record',
			record: salesorder
		});

		var signatureSearch = getSignatureSearchResult(salesorder);

		// log.debug({
		// 	title: 'Testing',
		// 	details: signatureSearch[0].id
		// });

		renderer.addSearchResults({
			templateName: 'signature',
			searchResult: signatureSearch
		});

		return renderer.renderAsPdf();
    }

	function getSignatureSearchResult(record){
		return search.create({
			type: 'customrecord_bsg_signature_capture',
			filters: [
				{
					name: 'custrecord_bsg_signature_work_order',
					operator: search.Operator.ANYOF,
					values: [record.id]
				},
			],
			columns: [
				'custrecord_bsg_signature_signed_by',
				'custrecord_bsg_signature_url'
			]
		})
		.run()
		.getRange({
			start: 0,
			end: 1
		});
	}
	exports.onRequest = onRequest;
	return exports;
});