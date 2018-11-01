function userEventAfterSubmit(type) 
{
var context = nlapiGetContext();
var recordid = nlapiGetRecordId();
var record = nlapiLoadRecord('expensereport', recordid);
nlapiLogExecution('DEBUG', 'record', recordid);
var amexCorpCard = record.getFieldValue('custbody_amex_corp_card');
nlapiLogExecution('DEBUG', 'Amex Corp Card True?', amexCorpCard);
var amount = record.getFieldValue('amount');
var employee = record.getFieldValue('entity');
var subsidiary = record.getFieldValue('subsidiary');
var expense = record.getFieldValue('tranid');
var isCorpCard = record.getFieldValue('custbody_is_corp_card');
var coupaER = record.getFieldValue('custbody_coupa_er_number');
var memo = record.getFieldValue('memo');
var currency = record.getFieldValue('currency');

if (amexCorpCard == 'T' && isCorpCard !='T' && subsidiary == '1' )
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE to Reclass Amex Corporate Cards - US');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', memo);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
//jeRec.setFieldValue('currency', currency);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Amex Corprate Cards to Amex Entity');
jeRec.setFieldValue('custbodypo_invoice_number', coupaER);

nlapiLogExecution('DEBUG', 'Message', 'After Setting Header');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
nlapiLogExecution('DEBUG', 'Employee', employee);
jeRec.setCurrentLineItemValue('line', 'entity', employee);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
//enter the amex account number below
jeRec.setCurrentLineItemValue('line', 'account', 12645);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiLogExecution('DEBUG', 'Message', 'After Setting Detail');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if (amexCorpCard == 'T' && isCorpCard !='T' && subsidiary == '40' )
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE to Reclass Amex Corporate Cards - SC');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', subsidiary);
jeRec.setFieldValue('memo', memo);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('currency', 1);
jeRec.setFieldValue('custbodypo_invoice_number', coupaER);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Amex Corprate Cards to Amex Entity');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', employee);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
//enter the amex account number below
jeRec.setCurrentLineItemValue('line', 'account', 12647);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

nlapiLogExecution('DEBUG', 'Message', 'Creating JE Successful!');
nlapiSubmitRecord(record, true);
}