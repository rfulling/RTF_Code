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
 * File :               ITG_SSU_SetCCBudgetReports.js
 * Script :             Suitelet
 * Script ID :          customscript_loec_ssu_setreportspage
 * Deployment ID:       customdeploy_loec_ssu_setreportspage
 * Version :            1.9
 * Date :               February 22nd 2015
 * Last Updated:        Monday March 28th 2016
 *
 * Requires:
 *
 * EO_NS_JS_V3.js
 * EO_Netsuite_Library_FormObjects.js
 * ITG_LIB_SetCCBudgetReports.js
 * EO_LIB_NSTimeSelectors.js
 *
 * Notes:
 *
 * Reports are created using the built in Reporting NetSuite object and these are
 * based on a saved search that filters the results by cost center.
 * Suitelet Report IDs:
 * Cost Center Budget Summary Report - 1
 * Cost Center Budget Detail Report - 2
 * Open Purchase Orders By Cost Center - 3
 * Cost Center vs Budget Report - 4
 *
 * Credits to Handsontable.com for jQuery Plugin.
 * http://handsontable.com/
 *
 * 10/27/2015  | Updated library functions to adjust for FY change
 * 01/12/2016  | File name change
 *
 * ******************************************************************************/
var g_bustingMetering = false;
var g_isSuiteletReq = true;
var g_context = nlapiGetContext();
var g_isProd = (g_context.getEnvironment() == 'PRODUCTION') ? true : false;
var g_currentFY = null;
var ITG_CCBDGT = {
    ADJUST_FISCAL_YEARS: ["63", "54"],
    ADJUST_FY_START: '54',
    NO_RESTRICTION_GROUP: g_isProd ? 856 : 856,
    XML_TEMPLATE: g_isProd ? 3568 : 3568,
    COMPANY_NAME: 'FONTEM US INC',
    REPORTS: ['Cost Center Budget vs Actual Report', 'Cost Center Budget Detail Report', 'Open Purchase Orders By Cost Center', 'Cost Center vs Budget Report'],
    CONFIG: {
        ID: 'customrecord_fmt_ccbudget_config',
        FIELD_PREFIX: 'custrecord_fmt_ccbudget_config_',
        FIELDS: ['repid', 'repname', 'xlsname', 'rowsjson', 'coljson', 'colno']
    },
    POST_PARAMS: {
        'reportParams': 'custpage_jsonobject',
        'submit': 'custpage_issubmit',
        'download': 'custpage_isdownload',
        'iswinpreq': 'iswinpreq',
        'iserror': 'iserror',
        'isfycall': 'isfycall',
        'year': 'year',
        'istimesel': 'istimesel',
        'postingperiod': 'postingperiod'
    },
    GET_PARAMS: {
        'ispreview': 'ispreview',
        'iserror': 'iserror',
        'download': 'download',
        'select': 'select',
        'selname': 'selname',
        'costcenter': 'costcenter',
        'year': 'year',
        'postingperiod': 'postingperiod',
        'ppfrom': 'ppfrom',
        'ppto': 'ppto',
        'date': 'date',
        'allcc': 'allcc'
    },
    SS_SCRIPT_ID: 'customscript_loec_ssc_setccbudgetreports',
    //Deployment IDs -> Use Manual for Suitelet Requests
    // SS_SCRIPT_DEPLOYMENT : 'customdeploy_loec_ssc_setccbudgetreports',
    SS_SCRIPT_DEPLOYMENT: 'customdeploy_loec_ssc_setccrep_manual',
    SS_SCRIPT_PARAM: 'custscript_fmt_reportparams',
    SS_SCRIPT_PARAM2: 'custscript_fmt_bustedmetering',
    SS_SCRIPT_PARAM3: 'custscript_fmt_requser',
    SS_SCRIPT_PARAM4: 'custscript_fmt_isscheduled',
    CLIENT_SCRIPT: 'customscript_loec_cue_setreportspage',
    REDIRECT_SRC: "function redirectToReport(id) { if (!isNaN(parseInt(id))) { window.ischanged = false; window.location = nlapiResolveURL('SUITELET', 'customscript_loec_ssu_setreportspage', 'customdeploy_loec_ssu_setreportspage') + '&ispreview=T' + '&id=' + parseInt(id); } else { alert('An unexpected error has ocurred. Please try again later!'); } }",
    DOWNLOAD_CSV: "function downloadExcelReport() { if (usrSubmitIsValid(false)) { var url = nlapiResolveURL('SUITELET', 'customscript_loec_ssu_setreportspage', 'customdeploy_loec_ssu_setreportspage'); url += '&download=T&select=' + nlapiGetFieldValue('custpage_fmt_reports_select'); url += '&costcenter=' + nlapiGetFieldValue('custpage_fmt_reports_costcenter'); url += '&year=' + nlapiGetFieldValue('custpage_fmt_reports_year'); url += '&date=' + nlapiGetFieldValue('custpage_fmt_reports_date'); url += '&postingperiod=' + nlapiGetFieldValue('custpage_fmt_reports_postingperiod'); url += '&ppfrom=' + nlapiGetFieldValue('custpage_fmt_reports_ppfrom'); url += '&ppto=' + nlapiGetFieldValue('custpage_fmt_reports_ppto'); var response = nlapiRequestURL(url, null, null, null); if (response != null) { var resURL = decodeURIComponent(response.getHeader('Custom-Header-Download')); var baseURL = (nlapiGetContext().getEnvironment() == 'SANDBOX') ? 'https://system.sandbox.netsuite.com' : 'https://system.netsuite.com'; window.ischanged = false; if (resURL == null || resURL == '') { var url = nlapiResolveURL('SUITELET', 'customscript_loec_ssu_setreportspage', 'customdeploy_loec_ssu_setreportspage'); window.location = url + '&iserror=T'; } else { window.location = baseURL + resURL.replace(' ', ''); } } else { window.ischanged = false; var url = nlapiResolveURL('SUITELET', 'customscript_loec_ssu_setreportspage', 'customdeploy_loec_ssu_setreportspage'); window.location = url + '&iserror=T'; } } return false; }",
    HELP_BUTTON: "function viewHelp() { var url = 'https://system.netsuite.com/c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/User_Guides/ITGBLu_CCBudget_Reports_UserGuideV3.pdf'; window.ischanged = false; window.open(url);}"
};

/**
 * Suitelet Entry Function.
 * Create the reports page or redirects page to report
 * selected by the user in the Reports Page.
 * @param : {nlobjRequest} request, {nlobjResponse} response
 * @return : {nlobjResponse} response
 * @author : eolguin@fmtconsultants.com
 */
function setReportsPage(request, response) {
    var method = request.getMethod();
    var params = (method == 'POST') ? getRequestParams(request, ITG_CCBDGT.POST_PARAMS) : getRequestParams(request, ITG_CCBDGT.GET_PARAMS);
    if (eo.js.objectHasValues(params)) {
        nlapiLogExecution('DEBUG', method + ' Report Parameters', JSON.stringify(params));
    }
    try {
        if (method == 'GET') {
            if (params != null) {
                if (params.iserror == 'T') {
                    setErrorResponse(response);
                }
                if (params.download == 'T') {
                    nlapiLogExecution('debug', ' reportIDs', params.select);
                    setDownloadReportResponse(params, response);
                }
                if (params.ispreview == 'T') {
                    setPreviewResponse(params, response);
                } else {
                    setMainResponse(response);
                }
            }
        }
        if (method == 'POST') {
            if (params != null) {
                if (params.isfycall == 'T') {
                    if (params.year != null) {
                        //Return Adjusted Fiscal Period Values
                        var filteredFY = getAllFiscalPeriods(null, params.year);
                        var output = JSON.stringify(filteredFY);
                        response.write(output);
                    }
                }
                if (params.istimesel == 'T') {
                    if (params.year != null && params.postingperiod != null) {
                        var ts = new EO_NSTimeSelectors(ITG_ADJUST_FY, ITG_ADJUST_PERIODS);
                        if (ts instanceof Object) {
                            if (ts.hasOwnProperty(params.postingperiod) && (ts[params.postingperiod] != null)) {
                                var sel = getAllFiscalPeriods([new nlobjSearchFilter("internalid", null, "anyof", eo.js.getArrayFromObject(ts[params.postingperiod]))]);
                                if (sel.length > 0) {
                                    var output = JSON.stringify(sel);
                                    response.write(output);
                                }
                            }
                        }
                    }
                }
                if (params.iserror == 'T') {
                    setErrorResponse(response);
                }
                if (params.submit == 'T') {
                    setScheduledResponse(params, response);
                }
            } else {
                setErrorResponse(response);
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', '[FMT] setReportsPage ' + 'User : ' + g_context.getUser() + ' ' + g_context.getName() + ' Request Method: ' + method, ' Time: ' + eo.js.getFormattedSysDateWithTimeStamp() + ' Error: ' + e);
        setErrorResponse(response);
    }
}

/**
 * Returns the file cabinet id depending on the execution
 * environment. Runs a search on custom record that stores
 * the file cabinet folder internal ids to be used in a
 * customization.
 * @param :  null
 * @return : {Float} folderId
 * @author : eolguin@fmtconsultants.com
 */
function getBudgetReportsFolderId() {
    var filters = [];
    filters.push(new nlobjSearchFilter("internalid", null, "is", "2"));
    filters.push(new nlobjSearchFilter("isinactive", null, "is", "F"));
    var columns = {
        'folderId': (g_isProd ? new nlobjSearchColumn('custrecord_fmt_foldermap_prodid', null) : new nlobjSearchColumn('custrecord_fmt_foldermap_sbid', null)).setLabel('folderId')
    };
    var searchResults = eo.ns.getSearchResults("customrecord_fmt_foldermap", filters, eo.js.getArrayFromObject(columns));
    var results = (searchResults != null) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
    return (results.length > 0) ? results[0].folderId : null;
}

/**
 * Writes Suitelet Main Entry Form
 * @param : {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setMainResponse(response) {
    //Set the report selection form, if no report tab has been clicked
    var form = nlapiCreateForm('Cost Center Budget Reports', false);
    form.addButton('custpage_reports_preview', 'Preview Report', 'previewExcelReport(); ');
    form.addButton('custpage_reports_download', 'Download Report', ' downloadExcelReport(); ' + ITG_CCBDGT.DOWNLOAD_CSV);
    form.addButton('custpage_reports_email', 'Email Reports', ' emailCSVReport(); ');
    form.addButton('custpage_reports_clear', 'Clear Fields', 'clearFormFields()');
    form.addButton('custpage_reports_help', 'Help', 'viewHelp(); ' + ITG_CCBDGT.HELP_BUTTON);
    form.setScript(ITG_CCBDGT.CLIENT_SCRIPT);
    setFormFields(form);
    //Write the response
    response.writePage(form);
}

/**
 * Sets the entry form fields
 * @author: eolguin@fmtconsultants.com
 * @param : {nlobjForm} form
 * @return : null
 */
function setFormFields(form) {
    //Set Page Description
    var pageDesc = form.addField('custpage_description', 'inlinehtml', null, null, null);
    var html = '<p style="font-size:11pt"></p>';
    pageDesc.setDefaultValue(html);

    //Set Select All option and Reports Filter Dropdown
    var selectALL = form.addField('custpage_fmt_reports_selectall', 'checkbox', 'Select All Reports', null, null);
    var isNoRes = isNoRestrictions();
    if (isNoRes) {
        var allCC = form.addField('custpage_fmt_reports_allcc', 'checkbox', 'Select All Cost Centers', null, null);
        var showAll = form.addField('custpage_fmt_reports_showall', 'checkbox', 'Show All Cost Centers', null, null);
        var showEmail = form.addField('custpage_fmt_reports_showemail', 'checkbox', 'Show Advanced Email Options', null, null);
    }
    //Set Form Fields
    setCostCenterFields(form, isNoRes);
    setReportNamesMultiselectField(form);
    setFiscalYearDropdownField(form);
    setPostingPeriodDropdownField(form);
    setFromToPostingPeriodFields(form);
    var dateOnOr = form.addField('custpage_fmt_reports_date', 'date', 'On Or Before Date', null, null);
    dateOnOr.setDisplayType('disabled');
    //Set POST Fields
    setPOSTFields(form);
}

/**
 * @param : {nlobjForm} form, {Boolean} isNoRes
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setCostCenterFields(form, isNoRes) {
    //Add field that allows us to control client side script behaviour on no restriction users
    var noRestrictions = form.addField('custpage_isnores', 'checkbox', 'No Res', null, null);
    noRestrictions.setDisplayType('hidden');
    //Set Cost Center Drop Down
    if (isNoRes) {
        //If current user is no restrictions, show all cost centers
        var costCenter = form.addField('custpage_fmt_reports_costcenter', 'select', 'Cost Center', 'department', null);
        costCenter.setBreakType('startcol');
        costCenter.setMandatory(true);
        //Set Email All Cost Center Reports field
        //Add the multi select field for email all
        var costCenterMulti = form.addField('custpage_fmt_reports_costcentermulti', 'multiselect', 'Cost Center', 'department', null);
        //costCenterMulti.setDisplayType('hidden');
        noRestrictions.setDefaultValue('T');
    } else {
        //Else only show cost centers where the user is an owner
        var costCenter = form.addField('custpage_fmt_reports_costcenter', 'select', 'Cost Center', null, null);
        //  costCenter.setBreakType('startcol');
        var costCenterDropDown = getOwnerCostCenterResults();
        if (costCenterDropDown != null) {
            for (var k = 0; k < costCenterDropDown.length; k++) {
                costCenter.addSelectOption(costCenterDropDown[k].ccId, costCenterDropDown[k].ccName);
            }
        }
        costCenter.setMandatory(true);
        noRestrictions.setDefaultValue('F');
    }
}

/**
 * @param : {nlobjForm} form
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setReportNamesMultiselectField(form) {
    //Get Report Names (From Configuration File)
    var allConfig = getReportsConfig(null);
    var reportSelection = form.addField('custpage_fmt_reports_select', 'multiselect', 'Report Name', null, null);
    for (var k = 0; k < allConfig.length; k++) {
        reportSelection.addSelectOption(allConfig[k].repid, allConfig[k].repname);
    }
}

/**
 * @param : {nlobjForm} form
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setFiscalYearDropdownField(form) {
    var today = new Date();
    //Set Fiscal Year  Dropdown
    var yearDropdown = getAllFiscalPeriods([new nlobjSearchFilter("isyear", null, "is", "T")]);
    if (yearDropdown != null) {
        var year = form.addField('custpage_fmt_reports_year', 'select', 'Select A Year', null, null);
        year.addSelectOption('', '');
        year.addSelectOption('all', '- All -');
        year.setBreakType('startcol');
        var len = yearDropdown.length;
        for (var k = 0; k < len; k++) {
            if (k + 1 >= len) {
                year.addSelectOption(yearDropdown[k].internalid, yearDropdown[k].periodname, true);
            } else {
                if (yearDropdown[k].internalid == '63') {
                    year.addSelectOption('ADJUSTED', (yearDropdown[k - 1].periodname + ' - ' + yearDropdown[k].periodname), (today.getFullYear() == 2015) ? true : false);
                } else {
                    year.addSelectOption(yearDropdown[k].internalid, yearDropdown[k].periodname);
                }
            }

        }
        g_currentFY = yearDropdown[yearDropdown.length - 1].internalid;
        // year.setMandatory(true);
        var thisFY = form.addField('custpage_fmt_reports_thisfy', 'text', 'Current FY', null, null);
        thisFY.setDefaultValue(g_currentFY);
        thisFY.setDisplayType('hidden');
    }
}

/**
 * @param : {nlobjForm} form
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setPostingPeriodDropdownField(form) {
    //Set Posting Period Dropdown
    var period = form.addField('custpage_fmt_reports_postingperiod', 'select', 'OR Period', null, null);
    period.addSelectOption('-9', '');
    period.addSelectOption('-7', '- Accounting Period - ');
    period.addSelectOption('0', '- Custom Range - ');
    //period.setBreakType('startcol');
    var ppDropdown = getPostingPeriodDropdown();
    for (var id in ppDropdown) {
        if (ppDropdown.hasOwnProperty(id)) {
            period.addSelectOption(ppDropdown[id].value, ppDropdown[id].text);
        }
    }
    //  period.setDisplayType('disabled');
}

/**
 * @param : {nlobjForm} form,
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setFromToPostingPeriodFields(form) {
    //Emulate and add From/To Posting Period Date Filters
    var periodFrom = form.addField('custpage_fmt_reports_ppfrom', 'select', 'From', null, null);
    var periodTo = form.addField('custpage_fmt_reports_ppto', 'select', 'To', null, null);
    periodFrom.addSelectOption('', '');
    periodTo.addSelectOption('', '');
    var ppPeriods = g_currentFY != null ? getAllFiscalPeriods(null, g_currentFY) : getAllFiscalPeriods();
    for (var p = 0; p < ppPeriods.length; p++) {
        periodTo.addSelectOption(ppPeriods[p].internalid, ppPeriods[p].periodname);
        periodFrom.addSelectOption(ppPeriods[p].internalid, ppPeriods[p].periodname);
    }
    periodFrom.setDisplayType('disabled');
    periodTo.setDisplayType('disabled');
}

/**
 * @param : {nlobjForm} form
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setPOSTFields(form) {
    //Set JSON Object to hold parameters in cases where GET request is too large and post call is used instead
    var jsonPOST = form.addField('custpage_jsonobject', 'longtext', 'JSON Object', null, null);
    jsonPOST.setDisplayType('hidden');
    var isSubmit = form.addField('custpage_issubmit', 'checkbox', 'Is Submit', null, null);
    isSubmit.setDisplayType('hidden');
    var isDownload = form.addField('custpage_isdownload', 'checkbox', 'Is Download', null, null);
    isDownload.setDisplayType('hidden');
    var isWinReq = form.addField('custpage_iswinpreq', 'checkbox', 'Is Win Request', null, null);
    isWinReq.setDisplayType('hidden');
}

/**
 * Writes the preview response form whenever "Preview Excel Report" is pressed
 * via client side.
 * @param : {Object} params, {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setPreviewResponse(params, response) {
    //Get Cost Center Owners and Fiscal Years
    params.costcenter = params.costcenter.join('');
    // nlapiLogExecution('debug', 'preview cost center', params.costcenter);
    var ccResults = getCostCenterOwners(params);
    // nlapiLogExecution('debug', ' reportIDs', params.select);
    if (ccResults.length > 0 && params.select.length == 1) {
        updatedParamsTimeSelectors(params);
        //Create Report Preview and add Handson jQuery Plugin Data
        var report = new EO_XMLToXLS(ccResults[0], params);
        //Create and write report preview form
        var previewForm = nlapiCreateForm(params.selname + ' - ' + ccResults[0].ccName, true);
        var previewTbl = previewForm.addField('custpage_preview_table', 'inlinehtml');
        previewTbl.setDefaultValue('<div>' + getHandsonPluginHtml(report, params) + '</div>');
        previewForm.addButton('custpage_cusbtn_preview', 'Close', 'javascript: window.close();');
        previewForm.addButton('custpage_cusbtn_refresh', 'Refresh', 'javascript: window.location.reload();');
        response.writePage(previewForm);
    } else {
        setErrorResponse(response);
    }
}

/**
 * Returns inInline HTML field value that injects Handson jQuery Plugin into
 * the report preview page.
 * @param : {Object} report, {Object} params
 * @return : {String} hsHtml
 * @author : eolguin@fmtconsultants.com
 */
function getHandsonPluginHtml(report, params) {
    //nlapiLogExecution('ERROR', 'Data for table', JSON.stringify(report.getPreviewReport(params.select)));
    nlapiLogExecution('ERROR', 'Params', JSON.stringify(params));
    var tableFormat = getTableFormat(parseInt(params.select));
    nlapiLogExecution('ERROR', 'tableFormat', tableFormat);
    var relURL = g_context.getEnvironment() == 'PRODUCTION' ? 'https://system.na1.netsuite.com/' : 'https://system.sandbox.netsuite.com/';
    var hsHtml = '<html><script src="' + relURL + 'c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/src/plugins/handsontable_full.js"></script>';
    hsHtml += '<link rel="stylesheet" media="screen" href="' + relURL + 'c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/src/plugins/handsontable_full.css">';
    hsHtml += '<link rel="stylesheet" media="screen" href="' + relURL + 'c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/src/plugins/handsontable_full.css">';
    hsHtml += '<link rel="stylesheet" media="screen" href="' + relURL + 'c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/src/plugins/handsontable_demo.css">';
    hsHtml += '<link rel="stylesheet" media="screen" href="' + relURL + 'c.3416361/suitebundle72041/FMT_Cost_Center_Budgets/src/plugins/handsontable_full.css">';
    hsHtml += '<style type="text/css"> body {background: white; margin: 20px;} h2 {margin: 20px 0;}</style><div id="previewtbl" class="handsontable"></div>';
    hsHtml += '<script>jQuery(document).ready(function() { var data =' + JSON.stringify(report.getPreviewReport(params.select)) + ', container = document.getElementById("previewtbl"), previewTbl; ';
    //hsHtml += 'previewTbl = new Handsontable(container, { data : data, minSpareRows : 1, colHeaders : true, contextMenu : true }); ';
    hsHtml += 'previewTbl = new Handsontable(container, { data : data, minSpareRows : 1, colHeaders : true, columns : ' + tableFormat + ', contextMenu : true }); ';
    hsHtml += 'function bindDumpButton() { Handsontable.Dom.addEvent(document.body, "click", function(e) { var element = e.target || e.srcElement; ';
    hsHtml += 'if (element.nodeName == "BUTTON" && element.name == "dump") { var name = element.getAttribute("data-dump"); ';
    hsHtml += 'var instance = element.getAttribute("data-instance"); var hot = window[instance]; } }); } bindDumpButton(); });</script>';
    return hsHtml;
}

/**
 * Writes the download response form whenever "Download Excel Report(s)" is pressed
 * via client side.
 * @param : {Object} params, {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setDownloadReportResponse(params, response) {
    //Get File Cabinet Folder ID
    var folderId = getBudgetReportsFolderId();
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'File Cabinet Folder : ' + folderId);
    params.costcenter = params.costcenter.join('');
    var reportURL = getReportCSVURL(params, response, folderId);
    if (reportURL != null) {
        var html = '<html><body></body></html>';
        nlapiLogExecution('debug', 'Report URL', reportURL);
        response.write(html);
        response.setHeader('Custom-Header-Download', encodeURIComponent(reportURL));
    } else {
        setErrorResponse(response);
    }
}

/**
 * Returns a URL of a file and creates a log in the job attempting
 * to download the file
 * @param : {Object} params, {nlobjResponse} response, {String} folderId
 * @return : {String} url
 * @author : eolguin@fmtconsultants.com
 */
function getReportCSVURL(params, response, folderId) {
    var ccResults = getCostCenterOwners(params);
    if (ccResults.length > 0) {
        var xlsXmlStr = getCostCenterOwnerReports(ccResults[0], params);
        if (xlsXmlStr != null) {
            var fileId = getXLSFileId(ccResults, folderId, xlsXmlStr);
            nlapiLogExecution('DEBUG', 'File Saved! ID# ', fileId);
            if (fileId != null) {
                var thisFile = eo.ns.loadFile(fileId);
                if (thisFile != null) {
                    return thisFile.getURL().toString();
                } else {
                    return null;
                }
            }
        } else {
            if (g_bustingMetering) {
                setBustedMeteringResponse(params, response);
            } else {
                setErrorResponse(response);
            }
        }
    }
    return null;
}

/**
 * Returns a file id
 * @param : {Object} ccResults, {String} folderId, {String} xlsXmlStr
 * @return : {String} fileId
 * @author : eolguin@fmtconsultants.com
 */
function getXLSFileId(ccResults, folderId, xlsXmlStr) {
    var xlsFile = null;
    try {
        var filePrefix = (ccResults[0].ccName + ' ' + ccResults[0].ccOwnerName);
        xlsFile = nlapiCreateFile(filePrefix + '_CostCenterBudgetReports_' + eo.js.getSysDate() + '.xls', 'EXCEL', nlapiEncrypt(xlsXmlStr, 'base64'));
        if (xlsFile != null) {
            xlsFile.setFolder(folderId);
            return nlapiSubmitFile(xlsFile);
        }
    } catch (error) {
        nlapiLogExecution('ERROR', 'Could not save file. See Error Msg:  ', error);
    }
    return null;
}

/**
 * Returns each cost center owner reports and stores them in
 * the file cabinet, if metering is about to run out, the request
 * is sent to the scheduled script.
 * Budget vs Actual, Transactions, Open PO and Actual vs Open PO
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} ccResult, {Object} params
 * @return : {Object} results
 */
function getCostCenterOwnerReports(ccResult, params) {
    var xmlStr = '';
    updatedParamsTimeSelectors(params);
    //Create Report Object Request
    var reports = new EO_XMLToXLS(ccResult, params);
    if (params != null) {
        if (params.hasOwnProperty('select')) {
            return reports.getAllReportsXML(params.select);
        }
    } else {
        return reports.getAllReportsXML(null);
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
    var thisRepParams = params.reportParams;
    //Update parameters
    try {
        if (thisRepParams != null) {
            //Parse Params to Object
            thisRepParams = JSON.parse(thisRepParams);
            //Update them and parse them back
            updatedParamsTimeSelectors(thisRepParams);
            thisRepParams = JSON.stringify(thisRepParams);
        }
    } catch (e) {
        nlapiLogExecution('ERROR', 'setScheduledResponse - Could not parse params! Params : ' + thisRepParams, e);
        thisRepParams = params.reportParams;
    }
    //Set Scheduled Script Parameters
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM] = thisRepParams;
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM2] = 'F';
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM3] = nlapiGetContext().getUser();
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM4] = 'T';

    //Initiate Scheduled Script Execution
    nlapiLogExecution('debug', '[FMT] Initiating Scheduled Script', 'JSON Params : ' + thisRepParams);
    nlapiScheduleScript(ITG_CCBDGT.SS_SCRIPT_ID, ITG_CCBDGT.SS_SCRIPT_DEPLOYMENT, ssParams);
    var responseForm = nlapiCreateForm('Cost Center Budget Reports', false);
    var msgField = responseForm.addField('custpage_res_content', 'inlinehtml');
    //Create HTML success message
    var msg = '<table border="0" cellpadding="6" style="font-size: 14pt">' + '<tr>' + '<td> <br\> <br\>Thank you for your submission. Your reports will be emailed to you shortly. <br\>';
    msg += '<br\></td>' + '</tr>' + '</table>';
    msg += '<script>setTimeout(function(){history.back();},120000);</script>';
    msgField.setDefaultValue(msg);
    responseForm.addButton('custpage_back', 'Go Back', 'javascript: history.go(-1)');
    response.writePage(responseForm);
}

/**
 * Writes error form in case an unexpected error occurs in the script
 * @param : {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setErrorResponse(response) {
    var hsHtml = '<html><p>An unexpected error has ocurred. Please contact your NetSuite Administrator or try again later</p></html>';
    hsHtml += '<script>setTimeout(function(){history.back();},120000);</script></html>';
    var errorForm = nlapiCreateForm('Error : Cost Center Budget Reports', true);
    var previewTbl = errorForm.addField('custpage_preview_table', 'inlinehtml');
    previewTbl.setDefaultValue(hsHtml);
    errorForm.addButton('custpage_cusbtn_preview', 'Go Back', 'javascript: history.go(-1)');
    response.writePage(errorForm);
}

/**
 * If a report generation request is about to bust the metering
 * write a response form to notify the user that their report has been scheduled instead
 * @param : {Object} params, {nlobjResponse} response
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
function setBustedMeteringResponse(params, response) {
    //If a request has been sent to generate the CSV File, call the scheduled script
    var ssParams = {};
    updatedParamsTimeSelectors(params);
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM] = JSON.stringify(params);
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM2] = 'T';
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM3] = nlapiGetContext().getUser();
    ssParams[ITG_CCBDGT.SS_SCRIPT_PARAM4] = 'F';
    //Initiate Scheduled Script Execution
    nlapiScheduleScript(ITG_CCBDGT.SS_SCRIPT_ID, ITG_CCBDGT.SS_SCRIPT_DEPLOYMENT, ssParams);
    nlapiLogExecution('debug', '[FMT] Initiating Scheduled Script - Busted Metering', 'JSON Params : ' + JSON.stringify(ssParams));
    var responseForm = nlapiCreateForm('Cost Center Budget Reports', false);
    var msgField = responseForm.addField('custpage_res_content', 'inlinehtml');
    //Create HTML success message
    var msg = '<table border="0" cellpadding="3" style="font-size: 12pt">' + '<tr>' + '<td>Thank you for your submission.<br\>';
    msg += 'Your request results exceeds the number of allowed records. Your request has been scheduled and your file will be made available ';
    msg += '<a href="/app/common/media/mediaitemfolders.nl?folder=85634&whence=&cmid=1426036194365" target="_blank"> here</a> shortly.';
    msg += '<br\></td>' + '</tr>' + '</table>';
    msg += '<script>setTimeout(function(){history.back();},120000);</script>';
    msgField.setDefaultValue(msg);
    responseForm.addButton('custpage_back', 'Go Back', 'javascript: history.go(-1)');
    response.writePage(responseForm);
}

/**
 * Returns a list of Cost Center owned by the current
 * user logged in
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} reportParams
 * @return : {Object} results
 */
function getOwnerCostCenterResults() {
    var filters = [];
    filters.push(new nlobjSearchFilter("custrecord_cost_center_owner", null, "anyof", [nlapiGetContext().getUser()]));
    var columns = {
        "ccId": new nlobjSearchColumn("internalid", null).setLabel("ccId"),
        "ccName": new nlobjSearchColumn("name", null).setSort(true).setLabel("ccName"),
        "ccOwner": new nlobjSearchColumn("custrecord_cost_center_owner", null).setLabel("ccOwner"),
        "ccOwnerName": new nlobjSearchColumn("formulatext", null).setFormula("TO_CHAR({custrecord_cost_center_owner})").setLabel("ccOwner")
    };
    var searchResults = eo.ns.getSearchResults("department", filters, eo.js.getArrayFromObject(columns));
    return (searchResults != null && searchResults.length > 0) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
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
                    params[id] = params[id].split('');
                    if (params[id].length > 0) {
                        params[id] = params[id].filter(function (elem) {
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
 * Returns True/False if the user belongs to the No Cost Center Restrictions Group
 * @author : eolguin@fmtconsultants.com
 * @param : null
 * @return : {Boolean} True/False
 */
function isNoRestrictions() {
    var noRes = nlapiSearchRecord('entitygroup', null, new nlobjSearchFilter('internalid', null, 'is', ITG_CCBDGT.NO_RESTRICTION_GROUP), new nlobjSearchColumn('internalid', "groupmember"));
    for (var int = 0; int < noRes.length; int++) {
        if (parseFloat(nlapiGetContext().getUser()) == parseFloat(noRes[int].getValue('internalid', 'groupmember'))) {
            return true;
        }
    }
    return false;
}

/**
 * Returns string with format of all non-header cells
 * @param  {int} report type is either 1 (Budget Summary), 2 (Budget Detail), 3 (Open Purchase Orders) or 4 (Budget vs Actual Open PO)
 * @return {string} format of all non-header cells
 */
function getTableFormat(reportType) {
    var stNumericFormat = '$0,0.00';

    switch (reportType) {
        case 1:
            return '[{type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, {type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, {type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}]';

        case 2:
            return '[{type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}]';

        case 3:
            return '[{type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, {type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}]';

        default:
            return '[{type: "text"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}, { type: "numeric", format: "' + stNumericFormat + '"}]';
    }
}