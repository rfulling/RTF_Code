    /*
     * Modified:Dean
     * BHS-113  Service Report Images
     */


    /**6565//customer
     * Module Description
     * 
     * Version    Date            Author           Remarks
     * 1.00       16 Feb 2016     ahalbleib
     * 1.10 	  07 NOV 2016     Myron James
     */

    /**
     * @param {nlobjPortlet}
     *            portletObj Current portlet object
     * @param {Number}
     *            column Column position index: 1 = left, 2 = middle, 3 = right
     * @returns {Void}
     */
    // Multiple invoice email interface
    // When sending an email from an invoice or customer record, add a list of all
    // invoices from that
    // customer to the email interface. The list will have the status, amount, and
    // date of each invoice along with
    // a check box which will attach the invoice to the message when checked and the
    // email is sent.
    var RECORD_QUOTE = 'estimate';
    var RECORD_ITEM_DOCUMENT = 'customrecord_item_tuff_image';
    var FIELD_DOCUMENT_TYPE_I = '9';
    function email_before_load(type, form, request) {
         if (type == 'view') { return };
        try {
            nlapiLogExecution('DEBUG', 'try type'+ type);
            if (type == 'create') {

                var tran = request.getParameter('transaction');
               
                if (tran) {
                    nlapiLogExecution('DEBUG', 'MJ Test', 'tran: ' + tran);
                    var type1 = nlapiLookupField('transaction', tran, 'type', true);
                    var entity = request.getParameter('entity');
                    var contacts = nlapiSearchRecord('contact', null,
                        [new nlobjSearchFilter('company', null, 'anyof', entity)],
                        [
                            new nlobjSearchColumn('internalid'),
                            new nlobjSearchColumn('email'),
                            new nlobjSearchColumn('custentity_email_group')
                        ]);

                    var index = 1;
                    var list = form.getSubList('ccbcclist');
                    for (var i = 0; contacts != null && i < contacts.length; i++) {

                        if (contacts[i].getText('custentity_email_group') == type1) {
                            nlapiLogExecution('DEBUG', 'MJ Test', 'contacts: ' + contacts[i].getValue('internalid'));
                            list.setLineItemValue('copyentity', index, contacts[i].getValue('internalid'));
                            list.setLineItemValue('email', index, contacts[i].getValue('email'));
                            list.setLineItemValue('cc', index, 'T');
                            index++;
                        }
                    }
                }
               
                if (form.getField('templatecategory') != null) form.getField('templatecategory').setDefaultValue(4);
                var entity = request.getParameter('entity');
                if (entity) {

                    var entitys = nlapiSearchRecord('entity', null, 
                    		new nlobjSearchFilter('internalid', null, 'anyof', entity), [new nlobjSearchColumn('type'), new nlobjSearchColumn('internalid')]);
                    nlapiLogExecution('DEBUG', 'aaa2 ', entitys[0].getValue('type') + entity);
                     
                    var trans = nlapiSearchRecord('transaction', 'customsearch_bjh_email_transaction', new nlobjSearchFilter('entity', null, 'anyof', entity), [new nlobjSearchColumn('tranid'), new nlobjSearchColumn('type')]); //new nlobjSearchColumn('custbody_fapi_job')]);
                    // nlapiLogExecution('debug','trans',JSON.stringify(trans));

                    var sub = form.addSubList('custpage_invoices', 'list', 'Transaction', 'attachments');
                    form.insertSubList(sub, 'mediaitem');
                    sub.addField('custpage_intid', 'text', 'Internal Id');// .setDisplayType('hidden');
                    sub.addField('custpage_stat', 'text', 'Status');
                    sub.addField('custpage_tranid', 'text', 'Transaction ID');
                    sub.addField('custpage_am', 'currency', 'Amount');
                    sub.addField('custpage_d', 'date', 'Date');
                    sub.addField('custpage_t', 'text', 'Type');
                    sub.addField('custpage_cb', 'checkbox', 'Attach');
                    sub.addField('custpage_fso', 'text', 'FSO');//.setDisplayType('hidden');


                    for (var i = 0; i < trans.length; i++) {
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_intid', i + 1, trans[i].getValue('internalid'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_stat', i + 1, trans[i].getText('statusref'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_tranid', i + 1, trans[i].getValue('tranid'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_am', i + 1, trans[i].getValue('amount'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_d', i + 1, trans[i].getValue('trandate'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_t', i + 1, trans[i].getText('type'));
                        nlapiSetLineItemValue('custpage_invoices', 'custpage_fso', i + 1, trans[i].getValue('customform'));
                        // nlapiLogExecution('debug','trans',trans[i].getText('type')
                        // + ':' +trans[i].getValue('custbody_fapi_asset'));
                    }
                    form.addField('custpage_include_assets', 'checkbox', 'Include CSV Asset List');
                    form.addField('custpage_ent', 'text', 'ent').setDisplayType('hidden').setDefaultValue(entity);
                }



                if (tran) {
                    var recordType = nlapiLookupField('transaction', tran, 'recordtype');
                    if (recordType == RECORD_QUOTE) {
                        var record = nlapiLoadRecord(RECORD_QUOTE, tran);
                        var count = record.getLineItemCount('item');

                        var hasSpecs = false;

                        for (var i = 1; i <= count; i++) {
                            var specs = record.getLineItemValue('item', 'custcol_bjl_chk_specs', i);

                            if (specs == 'T') {
                                hasSpecs = true;
                            }
                        }

                        if (hasSpecs == true) {
                            nlapiSetFieldValue('includetransaction', 'F');
                        }
                    }
                }
            }

            if (type == 'view') {

                form.setScript('customscript_messagecl');
                form.addButton('custpage_resend', 'Resend', 'resend()');
                var mes = nlapiSearchRecord('message', 'customsearch_bjh_message_attach', new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetRecordId()));
                var atts = new Array();
                for (var i = 0; mes != null && i < mes.length; i++) {

                    var cols = mes[0].getAllColumns();
                    if (mes[i].getValue(cols[5]) != '' && mes[i].getValue(cols[5]) != '') {
                        atts.push(mes[i].getValue(cols[5]));
                    }
                    if (i == 0) {
                        form.addField('custpage_sub', 'text', '').setDisplayType('hidden').setDefaultValue(mes[i].getValue(cols[0]));
                        form.addField('custpage_mes', 'longtext', '').setDisplayType('hidden').setDefaultValue(mes[i].getValue(cols[4]));
                        form.addField('custpage_cc', 'longtext', '').setDisplayType('hidden').setDefaultValue(mes[i].getValue(cols[3]));
                        form.addField('custpage_bcc', 'longtext', '').setDisplayType('hidden').setDefaultValue(mes[i].getValue(cols[2]));
                        form.addField('custpage_rec', 'longtext', '').setDisplayType('hidden').setDefaultValue(mes[i].getValue(cols[1]));
                    }
                }
                form.addField('custpage_atts', 'text', '').setDisplayType('hidden').setDefaultValue(atts.toString());
            }
        } catch (e) {
            nlapiLogExecution('ERROR', 'aaa3', 'entitys[0].getValue '+ ' ' + type + ' ERROR: ' + e);
        }
    }

    function email_bs(type) {

        try {

            if (type == 'create') {

                var lines = nlapiGetLineItemCount('custpage_invoices');
                var index = nlapiGetLineItemCount('mediaitem');
                index += 1;
                var transactions = new Array();
                var atts = new Array();
                for (var i = 1; i <= lines; i++) {

                    if (nlapiGetLineItemValue('custpage_invoices', 'custpage_cb', i) == 'T') {
                        var fid = null;

                        var id = nlapiGetLineItemValue('custpage_invoices', 'custpage_intid', i);
                        var typ = nlapiGetLineItemValue('custpage_invoices', 'custpage_t', i);
                        var fso = nlapiGetLineItemValue('custpage_invoices', 'custpage_fso', i);
                      
                        //fso=132;
                        nlapiLogExecution('debug', 'fso  ', fso + ':' + typ)
                        transactions.push(id);
                        if (typ == 'Invoice' && fso == null) {
                            var pdf = nlapiPrintRecord('TRANSACTION', id, 'PDF');
                            pdf.setName(typ + nlapiGetLineItemValue('custpage_invoices', 'custpage_tranid', i) + ' ' + i + index + ' ' + nlapiGetUser() + '.pdf');
                            pdf.setFolder(2572);

                            fid = nlapiSubmitFile(pdf);
                            atts.push(fid);
                        
                        } else if (typ == 'Invoice' && fso != null) {
                            var name = 'service report ' + nlapiGetLineItemValue('custpage_invoices', 'custpage_tranid', i) + ' ' + i + index + ' ' + nlapiGetUser() + '.pdf';
                            fid = serviceReport(id, name);
                            atts.push(fid);
                        } else if (typ != 'Invoice' && typ != 'Quote') {

                            var pdf = nlapiPrintRecord('TRANSACTION', id, 'PDF');
                            pdf.setName(typ + nlapiGetLineItemValue('custpage_invoices', 'custpage_tranid', i) + ' ' + i + index + ' ' + nlapiGetUser() + '.pdf');
                            pdf.setFolder(2572);

                            fid = nlapiSubmitFile(pdf);
                            atts.push(fid);
                        } else if (typ == 'Quote') {
                            //nlapiLogExecution('debug','Quote','Quote' +':'+typ);
                            var name = 'Quote ' + nlapiGetLineItemValue('custpage_invoices', 'custpage_tranid', i) + ' ' + i + index + ' ' + nlapiGetUser() + '.pdf';
                          //  fid = printQuote(id, name);
                            atts.push(fid);
                        }

                        nlapiSetLineItemValue('mediaitem', 'mediaitem', index, fid);

                        index++;
                    }

                }

                if (nlapiGetFieldValue('custpage_include_assets') == 'T') {
                    var entity = nlapiGetFieldValue('custpage_ent');
                    if (entity != null && entity != '' && entity.length > 0) {
                        var assets = nlapiSearchRecord('customrecord_bsg_asset_card', null,
                            new nlobjSearchFilter('custrecord_bsg_asset_assigned_customer', null, 'anyof', entity),
                            [new nlobjSearchColumn('custrecord_bsg_asset_customer_unit_no'),
                               new nlobjSearchColumn('name'),
                                new nlobjSearchColumn('custrecord_bsg_asset_type'),
                                new nlobjSearchColumn('custrecord_bsg_asset_serial'),
                                new nlobjSearchColumn('custrecord_bsg_asset_billing_customer'),
                                new nlobjSearchColumn('custrecord_bsg_asset_mfg_year'),

                                new nlobjSearchColumn('custrecord_bsg_asset_wc_date'),

                                new nlobjSearchColumn('custrecord_bsg_asset_date_sold'),
                                new nlobjSearchColumn('custrecord_bsg_asset_warranty_expiry_hrs'),
                                new nlobjSearchColumn('custrecord_bsg_asset_item'),
                                new nlobjSearchColumn('custrecord_bsg_asset_scheduled_service'),
                                new nlobjSearchColumn('custrecord_bsg_asset_last_service'),
                                new nlobjSearchColumn('custrecord_bsg_asset_next_service')]);
                        var string = 'UNIT NUMBER,NAME,ASSET TYPE,SERIAL NUMBER,ASSET OWNER,YR,DATE RENTED,DATE SOLD,HOURS,ASSET IS ITEM,PM,LAST PM DATE,NEXT PM DATE\n'
                        for (var i = 0; assets != null && i < assets.length; i++) {
                            var cols = assets[i].getAllColumns();
                            nlapiLogExecution('ERROR', assets[i].getValue(cols[1]), assets[i].getValue(cols[2]));
                            string += (assets[i].getValue(cols[0]) != null ? assets[i].getValue(cols[0]).replace(/,/g, "") : '')
                                + ',' + (assets[i].getValue(cols[1]) != null ? assets[i].getValue(cols[1]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getText(cols[2]) != null ? assets[i].getText(cols[2]).replace(/,/g, '","') : '')
                                + ',' + (assets[i].getValue(cols[3]) != null ? assets[i].getValue(cols[3]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getText(cols[4]) != null ? assets[i].getText(cols[4]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[5]) != null ? assets[i].getValue(cols[5]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[6]) != null ? assets[i].getValue(cols[6]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[7]) != null ? assets[i].getValue(cols[7]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[8]) != null ? assets[i].getValue(cols[8]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getText(cols[9]) != null ? assets[i].getText(cols[9]).replace(/,/g, '').replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[10]) != null ? assets[i].getValue(cols[10]).replace(/,/g, '') : '')
                                + ',' + (assets[i].getValue(cols[11]) != null ? assets[i].getValue(cols[11]).replace(/,/g, '') : '') + '\n';
                        }
                        var file = nlapiCreateFile('assetsatlocation' + entity + '.csv', 'CSV', string);
                        // pdf.setName(typ+nlapiGetLineItemValue('custpage_invoices','custpage_tranid',i)+'
                        // '+i+index+' '+nlapiGetUser()+'.pdf');
                        file.setFolder(59077);

                        fid = nlapiSubmitFile(file);
                        atts.push(fid);
                        nlapiSetLineItemValue('mediaitem', 'mediaitem', parseInt(nlapiGetLineItemCount('mediaitem')) + 1, fid);
                    }
                }
                for (var i = 0; i < transactions.length; i++) {
                    if (transactions[i] != nlapiGetFieldValue('transaction')) {
                        var message = nlapiCreateRecord('message');
                        message.setFieldValue('subject', nlapiGetFieldValue('subject'));
                        message.setFieldValue('message', nlapiGetFieldValue('message'));
                        message.setFieldValue('transaction', transactions[i]);
                        message.setFieldValue('emailed', 'T');
                        message.setFieldValue('author', nlapiGetFieldValue('author'));
                        message.setFieldValue('recipientemail', nlapiGetFieldValue('recipientemail'));
                        message.setFieldValue('cc', nlapiGetFieldValue('cc'));
                        message.setFieldValue('bcc', nlapiGetFieldValue('bcc'));
                        for (var j = 1; j <= nlapiGetLineItemCount('mediaitem'); j++) {
                            message.setLineItemValue('mediaitem', 'mediaitem', parseInt(message.getLineItemCount('mediaitem')) + 1, nlapiGetLineItemValue('mediaitem', 'mediaitem', j));
                        }
                        // for (var j=0;j<atts.length;j++){
                        // message.setLineItemValue('mediaitem','mediaitem',parseInt(nlapiGetLineItemCount('mediaitem'))+1,fid);
                        // }
                        nlapiSubmitRecord(message);
                        // nlapiLogExecution('ERROR',fid,index);

                    }
                }
            }


        } catch (e) {
            nlapiLogExecution('ERROR', 'assetCard', ' ERROR BS: ' + e);
        }

    }

    function resend() {

        var recipient = nlapiGetFieldValue('custpage_rec');
        var atts = nlapiGetFieldValue('custpage_atts');
        var subject = nlapiGetFieldValue('custpage_sub');
        var body = nlapiGetFieldValue('custpage_mes');
        var entity = nlapiGetFieldValue('entity');
        var rec = nlapiGetFieldValue('custpage_rec');
        var cc = nlapiGetFieldValue('custpage_cc');
        var bcc = nlapiGetFieldValue('custpage_bcc');
        var transaction = nlapiGetFieldValue('transaction');
        var attach = new Object();

        if (entity != null && entity != '') {
            attach['entity'] = entity;
        }
        if (transaction != null && transaction != '') {
            attach['transaction'] = transaction;
        }
        if (bcc == '') {
            bcc = null;
        }
        if (cc == '') {
            cc = null;
        }
        if (atts.length == 0) {
            atts = null;
        }

        var args = '&messid=' + nlapiGetRecordId() + '&sub=' + subject + '&cc=' + cc + '&bcc=' + bcc + '&recipient=' + recipient + '&atts=' + atts + '&attach=' + JSON.stringify(attach);
        var resp = nlapiRequestURL(nlapiResolveURL('SUITELET', 'customscript_resend_email', 'customdeploy_resend_email') + args);
        alert(resp.getBody());
    }

    function resend_sl(request, response) {

        try {

            var subject = request.getParameter('sub');
            var id = request.getParameter('messid');
            var body = nlapiLookupField('message', id, 'message');
            var cc = request.getParameter('cc');
            var bcc = request.getParameter('bcc');
            if (cc != 'null')
                cc = cc.split(',');
            else
                cc = null;
            if (bcc != 'null')
                bcc = bcc.split(',');
            else
                bcc = null;
            var recipient = request.getParameter('recipient');
            var author = request.getParameter('author');
            var atts = request.getParameter('atts');
            if (atts.indexOf(',') > -1) {
                atts = atts.split(',');
                for (var i = 0; i < atts.length; i++) {
                    atts[i] = nlapiLoadFile(atts[i]);
                }
            } else if (atts != 'null') {
                atts = nlapiLoadFile(atts);
            } else {
                atts = null;
            }

            var attach = request.getParameter('attach');
            attach = JSON.parse(attach);
            if ((attach['transaction'] == null || typeof attach['transaction'] == 'undefined') && (attach['entity'] == null || typeof attach['entity'] == 'undefined')) {
                attach = null;
            }

            nlapiLogExecution('ERROR', author, recipient + ' ' + cc + ' ' + bcc);
            nlapiSendEmail(nlapiGetUser(), recipient, subject, body, cc, bcc, attach, atts);
            response.write('email sent');
        } catch (e) {
            response.write(e.message);
        }
    }
    /*Generate PDF Service Report*/
    function serviceReport(inv_id, name) {
  
    	
    	
        var file = nlapiLoadFile(126309);
        var xmltemp = file.getValue();

        var renderer = nlapiCreateTemplateRenderer();
        renderer.setTemplate(xmltemp);
        loadRec = nlapiLoadRecord('invoice', inv_id);
        renderer.addRecord('record', loadRec);
        var assetID = loadRec.getFieldValue('custbody_bsg_asset_card');
         
        var faRec = nlapiLoadRecord('customrecord_bsg_asset_card', assetID);
             renderer.addRecord('farecord', faRec);
          
             nlapiLogExecution('DEBUG', 'here in service ', faRec);
      var pdftemp = renderer.renderToString().replace(/&/g, '&amp;');
        var data = nlapiXMLToPDF(pdftemp);
        nlapiLogExecution('Debug', 'createDocument.BODY', data);

        data.setName('SRRTF-'+loadRec.getFieldValue('tranid')+'.pdf');
        data.setName(name);
        data.setFolder(2572);
        data.setEncoding('UTF-8');

        return nlapiSubmitFile(data);
    }

    /*Generate PDF Quote*/
    function printQuote(id, name) {

        var itemArr = [];
        var itemObj = {};
        var pdfset = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        pdfset += '\n';
        pdfset += '<pdfset>';
        pdfset += '\n';
        var endpdfset = '</pdfset>';
        var template = nlapiGetContext().getSetting('Script', 'custscript_bjl_quote_temp');
        var pdftemp = null;
        var pdfurl = "";
        var record = nlapiLoadRecord('estimate', id);
        var logoId = record.getFieldValue('custbody_location_url');
        var urllogo = "https://system.netsuite.com" + nlapiLoadFile(logoId).getURL();
        pdftemp = template;
        var count = record.getLineItemCount('item');
        for (var i = 1; i <= count; i++) {
            var itemId = record.getLineItemValue('item', 'item', i);
            var specs = record.getLineItemValue('item', 'custcol_bjl_chk_specs', i);
            if (specs == 'T') {
                itemArr.push(itemId);
                if (itemObj[itemId] == null) {
                    itemObj[itemId] = {
                        'url': null
                    }
                }
            }

        }

        nlapiLogExecution('DEBUG', 'itemArr', JSON.stringify(itemArr));
        if (itemArr.length > 0) {

            var results = getResults({
                'type': RECORD_ITEM_DOCUMENT,
                'filters': [new nlobjSearchFilter('custrecord_item_image_item', null, 'anyof', itemArr), new nlobjSearchFilter('custrecord_item_image_isvideo', null, 'is', FIELD_DOCUMENT_TYPE_I)],
                'columns': [new nlobjSearchColumn('custrecord_item_image_item'), new nlobjSearchColumn('custrecord_bjl_item_image_prd_url')]
            });

            nlapiLogExecution('DEBUG', 'results', JSON.stringify(results));

            if (results != null) {
                for (var r = 0; r < results.length; r++) {
                    var itemId = results[r].getValue('custrecord_item_image_item');
                    var url = results[r].getValue('custrecord_bjl_item_image_prd_url');

                    if (itemObj[itemId]) {
                        itemObj[itemId].url = url;
                    }
                }
            }

            for (var i in itemObj) {
                var url = itemObj[i].url;
                if (url != '' && url != null) {
                    pdfurl += "<pdf src='" + url + "'/>"
                }
            }
        }

        nlapiLogExecution('DEBUG', 'record', JSON.stringify(record));

        pdftemp = pdftemp.replace('{urllogo}', nlapiEscapeXML(urllogo));
        pdftemp = pdftemp.replace('{pdfurl}', pdfurl);
        var rendertemp = nlapiCreateTemplateRenderer();
        rendertemp.setTemplate(pdftemp);
        rendertemp.addRecord('record', record);
        pdfset += rendertemp.renderToString();
        pdfset += endpdfset;
        var file = nlapiXMLToPDF(pdfset);

        file.setName(name);
        file.setFolder(59077);
        file.setEncoding('UTF-8');

        return nlapiSubmitFile(file);
    }

    /*Search Record Function*/
    function getResults(data) {

        try {

            var s = null;
            var results = [];
            var min = 0;
            var max = 1000;

            if (data.search) {
                s = nlapiLoadSearch(data.type, data.search);
            } else {
                s = nlapiCreateSearch(data.type);
            }

            if (data.filters) {
                s.addFilters(data.filters);
            }
            if (data.columns) {
                s.addColumns(data.columns);
            }
            s = s.runSearch();
            var resultset;

            while (true) {
                resultset = s.getResults(min, max);
                if (resultset == null || resultset.length <= 0)
                    break;
                else {
                    min = max;
                    max += 1000;
                }
                ;

                for (var i = 0; i < resultset.length; i++) {
                    results.push(resultset[i]);
                }
            }
            return results;

        } catch (ex) {
            nlapiLogExecution('ERROR', ' getResults', 'ERROR: ' + ex);
        }

    }