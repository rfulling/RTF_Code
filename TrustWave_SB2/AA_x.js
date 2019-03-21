if (product==null) product="";
if (product_type==null) product_type="";
if (product_group==null) product_group="";
if (product_line==null) product_line="";
if (inCounter==null) inCounter= "";
if (inProj==null) inProj= "";



if (inCounter.equals("")) inCounter="0";

if (OppId==null){ OppId="";}

var CreateProj="N";

if (product_type.equals("Professional Service") | product_type.equals("Service, Install & Training")
    | product_type.equals("SpiderLabs") | product_type.equals("SpiderLabs Non-Subscription"))
   CreateProj="Y";

if (   product_type.equals("Subscription Compliance") 
     & product_group.equals("Compliance Services")
     & product_line.equals("CVS")
     & !product.equals("BREACHPROTECTION-100K, 1 year")  
     & !product.equals("BREACHPROTECTION-100K, 3 year")  
     & !product.equals("BREACHPROTECTION-100K, 5 year")  
     & !product.equals("BREACHPROTECTION-25K, 1 year") 
     & !product.equals("BREACHPROTECTION-50K, 1 year") 
     & !product.equals("BREACHPROTECTION-50K, 3 year")
    )  CreateProj="Y";

if ( product.equals("AHMA-OPN7A1") || product.equals("AHMA-TFIQ18") || product.equals("AHMA-OSPIYZ") ) 
  CreateProj="Y";
 
if (CreateProj.equals("Y"))
{
  var  pjString= inCounter;
     var  pj=0;
  pj= Integer.parseInt(pjString);
  pj++;
    outCounter = Integer.toString(pj);
  outproj=inProj;

}
else
{
  outproj = "n/a";
  outCounter=inCounter;
}