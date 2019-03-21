var vc =nlapiLoadRecord('vendorcredit', 6459357);
//vc.setFieldValue('usertotal',parseFloat(11.32));
//vc.setFieldValue('totalfield',parseFloat(11.32));
//vc.setFieldValue('taxtotal',parseFloat(0.00));

//vc.setFieldValue('applied',parseFloat(11.32));
vc.setLineItemValue('expense','taxcode', 1,5);
//vc.setLineItemValue('expense','tax1amt', 1,0.00);
//vc.setLineItemValue('expense','taxrate1', 1,0.00);
//vc.setLineItemValue('expense','grossamt', 1,11.32);

vc.commitLineItem('expense');

nlapiSubmitRecord(vc);