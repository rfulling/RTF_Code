/*******************************************************************************
 * The following javascript code is created by FMT Consultants LLC,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": FMT Consultants LLC shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:             FMT Consultants LLC, www.fmtconsultants.com
 * Author:              Elean Olguin - info@eolguin.com
 * Name :               [ITG] Send Blu CC Reports (Suitelet)
 * File :               ITG_SSU_SendCCReports.js
 * Script :             Suitelet
 * Script ID :          customscript_itg_ssu_sendccreports
 * Deployment ID:       customdeploy_itg_ssu_sendccreports
 * Version :            1.0
 * Date :               Wednesday January 27th 2016
 * Last Updated:
 *
 * Requires:
 *
 * EO_NS_JS_V3.js
 * ITG_LIB_SetCCBudgetReports.js
 * EO_LIB_NSTimeSelectors.js
 *
 * ******************************************************************************/
//Constants
var ITG_CCBDGT = {
    GET_PARAMS: {
        'iswinpreq': 'iswinpreq',
        'select': 'select',
        'costcenter': 'costcenter',
        'year': 'year',
        'postingperiod': 'postingperiod',
        'ppfrom': 'ppfrom',
        'ppto': 'ppto',
        'date': 'date',
        'allcc': 'allcc'
    },
    POST_PARAMS: {
        'reqParams': 'custpage_jsonobject',
        'emailParams': 'custpage_emailjson',
        'subject': 'custpage_subject',
        'message': 'custpage_message',
        'reqUser': 'custpage_requser',
        'sendtoall': 'custpage_toallccowners'
    },
    SS_SCRIPT_ID: 'customscript_loec_ssc_setccbudgetreports',
    SS_SCRIPT_DEPLOYMENT: 'customdeploy_loec_ssc_setccrep_manual',
    SS_SCRIPT_PARAM: 'custscript_fmt_reportparams',
    SS_SCRIPT_PARAM2: 'custscript_fmt_bustedmetering',
    SS_SCRIPT_PARAM3: 'custscript_fmt_requser',
    SS_SCRIPT_PARAM4: 'custscript_fmt_isscheduled',
    SS_SCRIPT_PARAM5: 'custscript_fmt_iswinpreq',
    SS_SCRIPT_PARAM6: 'custscript_fmt_emailparams',
    SS_SCRIPT_PARAM7: 'custscript_fmt_sendtoall',
};
/**
 * Suitelet entry function : Generate Send Email Window Popup
 * @author : elean.olguin@gmail.com
 * @param  : {Object} request
 * @param  : {Object} response
 */
function setSendReportEmailPage(request, response) {
    var method = request.getMethod();
    var params = (method == 'POST') ? getRequestParams(request, ITG_CCBDGT.POST_PARAMS) : getRequestParams(request, ITG_CCBDGT.GET_PARAMS);
    nlapiLogExecution('DEBUG', 'Params for ' + method, JSON.stringify(params));
    if (method == 'GET') {
        //Set Form Elements
        var form = nlapiCreateForm('Email Cost Center Reports', true);
        form.setScript('customscript_itg_cue_sendccreports');
        setSendEmailForm(form);
        setPOSTFields(form, params);
        //Write Form
        response.writePage(form);
    }
    if (method == 'POST') {
        setScheduledResponse(params, response);
    }
}

/**
 * Writes Response whenever Scheduled Script is called.
 * Used for emailing of reports or if metering is running low.
 * @param : {Object} params, {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setScheduledResponse(params, response) {
    //If a request has been sent to generate the CSV File, call the scheduled script
    var ssParams = {};
    //Update parameters
    try {
        if (!eo.js.isEmpty(params.reqParams)) {
            var parsedParams = JSON.parse(params.reqParams);
            if (parsedParams instanceof Object) {
                parsedParams.select = parsedParams.select.join(',');
                if (parsedParams.allcc != 'T') {
                    parsedParams.costcenter = parsedParams.costcenter.join(',');
                }
                updatedParamsTimeSelectors(parsedParams);
                params.reqParams = JSON.stringify(parsedParams);
            }
        }
        //Parse Email Addresses
        if (!eo.js.isEmpty(params.emailParams)) {
            var parsedEmailParams = JSON.parse(params.emailParams);
            if (parsedEmailParams instanceof Array) {
                params.emailParams = JSON.stringify({
                    'recipients': extractEmailAddresses(parsedEmailParams, false, false, true),
                    'cc': extractEmailAddresses(parsedEmailParams, true, false, false),
                    'bcc': extractEmailAddresses(parsedEmailParams, false, true, false),
                    'subject': params.subject,
                    'message': params.message,
                    'from': params.reqUser
                });
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', 'setScheduledResponse - Could not parse params!', params.reqParams);
        nlapiLogExecution('ERROR', 'Could not parse params! Error Msg : ', e);
    }
    //Set Scheduled Script Parameters
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM] = params.reqParams;
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM2] = 'F';
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM3] = nlapiGetContext().getUser();
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM4] = 'T';
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM5] = 'T';
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM6] = params.emailParams;
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM7] = params.sendtoall;

    //Initiate Scheduled Script Execution
    nlapiLogExecution('debug', '[FMT] Initiating Scheduled Script : JSON Params ', JSON.stringify(ssParams));
    nlapiScheduleScript(ITG_CCBDGT.SS_SCRIPT_ID, ITG_CCBDGT.SS_SCRIPT_DEPLOYMENT, ssParams);

    //Set Response Form
    var form = nlapiCreateForm('Email Cost Center Reports', true);
    var msgField = form.addField('custpage_res_content', 'inlinehtml');
    //Create HTML success message
    var msg = '<table border="0" cellpadding="6" style="font-size: 14pt">' + '<tr>' + '<td> <br\> <br\>Thank you for your submission. Your reports will be emailed to you shortly. <br\>';
    msg += '<br\></td>' + '</tr>' + '</table>';
    msgField.setDefaultValue(msg);
    form.addButton('custpage_clearcancel', 'Close', 'window.close(); return false;');
    response.writePage(form);
}

/**
 * @param : {Object} emails, {Boolean} getCC, {Boolean} getBCC, {Boolean} getRecipients
 * @return : {Object} filteredEmails
 * @author : eolguin@fmtconsultants.com
 */
function extractEmailAddresses(emails, getCC, getBCC, getRecipients) {
    var filteredEmails = emails.filter(function (elem) {
        if (getCC) {
            return elem.cc == 'T' ? true : false;
        } else if (getBCC) {
            return elem.bcc == 'T' ? true : false;
        } else if (getRecipients) {
            return elem.cc != 'T' && elem.bcc != 'T' ? true : false;
        }
    });
    return filteredEmails.length > 0 ? eo.js.getUniqueArray(filteredEmails, 'email') : [];
}

/**
 * @param : {nlobjForm} form, {Object} params
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setPOSTFields(form, params) {
    var jsonPOST = form.addField('custpage_jsonobject', 'longtext', 'JSON Object', null, null);
    jsonPOST.setDisplayType('hidden');
    var emailParams = form.addField('custpage_emailjson', 'longtext', 'Email JSON', null, null);
    emailParams.setDisplayType('hidden');
    if (params != null) {
        jsonPOST.setDefaultValue(JSON.stringify(params));
    }
}

/**
 * Retrieves parameter values from an nlobjRequest
 * @param {nlobjRequest} request, {Object} paramMap
 * @return {Object} params
 * @author elean.olguin@gmail.com
 */
function getRequestParams(request, paramMap) {
    var params = {
        ppname: null
    };
    for (var id in paramMap) {
        if (paramMap.hasOwnProperty(id)) {
            if (id == 'select' || id == 'costcenter') {
                params[id] = eo.js.parseNull(decodeURIComponent(request.getParameter(paramMap[id])));
                if (params[id] != null) {
                    var splitParams = String(params[id]).split(',');
                    if (splitParams.length > 0) {
                        params[id] = splitParams.filter(function (elem) {
                            return !isNaN(parseFloat(elem)) ? true : false;
                        });
                    }
                }
            } else {
                params[id] = decodeURIComponent(eo.js.parseNull(request.getParameter(paramMap[id])));
            }
        }
    }
    if (params['postingperiod'] != null) {
        var ppObj = getPostingPeriodDropdown(params['postingperiod']);
        params.ppname = (ppObj != null) ? ppObj.text : null;
    }
    return params;
}

/**
 * @author : elean.olguin@gmail.com
 * @param  : {Object} form
 * @return : null
 */
function setSendEmailForm(form) {
    var tabRecipients = form.addTab('custpage_recipients', 'Recipients');
    var tabMessages = form.addTab('custpage_message', 'Message');
    //Add Buttons
    var submit = form.addSubmitButton();
    submit.setLabel('Send');
    form.addButton('custpage_clearcancel', 'Cancel', 'window.close(); return false;');
    //Set Recipient Fields
    setFormEmailReceipientFields(form);
    //Set Sublists
    setFormRecipientSublist(form);
    //Set Message Fields
    setFormMessageTab(form);
}

/**
 * @author : elean.olguin@gmail.com
 * @param  : {nlobjForm} form
 * @return : null
 */
function setFormEmailReceipientFields(form) {
    //From Email/Employee
    var fldFrom = form.addField('custpage_requser', 'select', 'From', 'employee', 'custpage_recipients').setMandatory(true);
    fldFrom.setDefaultValue(nlapiGetContext().getUser());
    fldFrom.setLayoutType('startrow', 'startcol');
    fldFrom.setDisplayType('inline');

    var fldTo = form.addField('custpage_sendto', 'select', 'To', 'employee', 'custpage_recipients').setMandatory(true);
    fldTo.setDefaultValue(nlapiGetContext().getUser());
    //Populate Recipient tab
    var sendtoCCOwner = form.addField('custpage_toallccowners', 'checkbox', 'Add Cost Center Owner In The Recipients', null, 'custpage_recipients');
    sendtoCCOwner.setHelpText('Select this option if you would like to send the reports to the Cost Center Owner of the report');
    sendtoCCOwner.setLayoutType('startrow', 'startcol');
}

/**
 * @author : elean.olguin@gmail.com
 * @param  : {nlobjForm} form
 * @return : null
 */
function setFormRecipientSublist(form) {
    var recipList = form.addSubList('custpage_rplis', 'inlineeditor', 'Select Other Recipient(s)', 'custpage_recipients');
    recipList.setHelpText('Select people to copy in this email or add email addresses directly from the list below. Please check the option Send To Cost Center Owner if you would like to include the Cost Center Owner as a recipient.');
    recipList.addField('custpage_rplis_empid', 'select', 'Employee Name', 'employee');
    //Set CC Recipients
    var rplisEmail = recipList.addField('custpage_rplis_email', 'email', 'Email');
    rplisEmail.setMandatory(true);
    recipList.addField('custpage_rplis_cc', 'checkbox', 'CC');
    recipList.addField('custpage_rplis_bcc', 'checkbox', 'BCC');
}

/**
 * @author : elean.olguin@gmail.com
 * @param  : {nlobjForm} form
 * @return : null
 */
function setFormMessageTab(form) {
    //Populate Message tab
    var fldSubject = form.addField('custpage_subject', 'text', 'Subject', null, 'custpage_message').setMandatory(true);
    fldSubject.setLayoutType('startrow', 'startcol');
    fldSubject.setDefaultValue('FONTEM US INC Cost Center/Budget Reports');
    fldSubject.setDisplaySize(50, 200);

    var fldMessage = form.addField('custpage_message', 'richtext', 'Message', null, 'custpage_message');
    fldMessage.setDisplaySize(200, 400);
    fldMessage.setLayoutType('startrow', 'startcol');
    fldMessage.setDefaultValue('This is an automated message. <BR> Attached are the Cost Center Budget Report files.');
}
