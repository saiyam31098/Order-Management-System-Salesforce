public with sharing class OrderDemoController {
    public OrderDemoController() {

    }

    class ProductDetail{
        public String Id;
        public String Name;
        public String ProductCode;
        public String Brand;
        public String Stock_Quantity;
        public String Quantity;
        public String ListPrice;
        public String UnitPrice;
        public String Discount;
        public String PriceBookEntryId;
    }

    class StockUpdate{
        public String Id;
        public String Stock_Quantity;
    }

    @AuraEnabled
    public static String getProducts(String searchVal,String priceBookId, String inSearch){
        //trial
        List<PriceBookEntry> pbProIdList=new List<PriceBookEntry>();
        pbProIdList = [select Product2Id from PriceBookEntry where Pricebook2Id=:priceBookId];
        Set<String> proIdList = new Set<String>();
        for (PriceBookEntry pbe : pbProIdList) {
            proIdList.add(pbe.Product2Id);
        }
        //trail ends


        //Search Criteria Starts
        map<Id,Product2> productList;
        list<PricebookEntry> priceBookEntryIdList;


        if(inSearch == 'Name') {
            productList = new map<Id,Product2>([select Id,ProductCode,Name,Brand__c,Stock_Quantity__c from Product2 where Name LIKE :'%'+searchVal+'%' AND Id IN :proIdList AND Stock_Quantity__c>0]);
            priceBookEntryIdList=[select Id,Product2Id,UnitPrice from PricebookEntry where Product2Id IN :productList.keySet() AND Pricebook2Id=:priceBookId];
        } else if(inSearch == 'Product Code') {
            productList = new map<Id,Product2>([select Id,ProductCode,Name,Brand__c,Stock_Quantity__c from Product2 where ProductCode LIKE :'%'+searchVal+'%' AND Id IN :proIdList AND Stock_Quantity__c>0]);
            priceBookEntryIdList=[select Id,Product2Id,UnitPrice from PricebookEntry where Product2Id IN :productList.keySet() AND Pricebook2Id=:priceBookId];
        } else if(inSearch == 'Brand') {
            productList = new map<Id,Product2>([select Id,ProductCode,Name,Brand__c,Stock_Quantity__c from Product2 where Brand__c LIKE :'%'+searchVal+'%' AND Id IN :proIdList AND Stock_Quantity__c>0]);
            priceBookEntryIdList=[select Id,Product2Id,UnitPrice from PricebookEntry where Product2Id IN :productList.keySet() AND Pricebook2Id=:priceBookId];
        } else if(inSearch == 'MRP') {
            Decimal s = decimal.valueOf(searchVal);
            productList = new map<Id,Product2>([select Id,ProductCode,Name,Brand__c,Stock_Quantity__c from Product2 where Id IN :proIdList AND Stock_Quantity__c>0]);
            priceBookEntryIdList=[select Id,Product2Id,UnitPrice from PricebookEntry where Product2Id IN :productList.keySet() AND Pricebook2Id=:priceBookId AND UnitPrice=:s];
        }
 
        //Search Criteria Ends

        // list<PriceBookEntry> proIdList = [select Id, Product2Id from PriceBookEntry where Pricebook2Id=:priceBookId];
        // map<Id,Product2> productList = new map<Id,Product2>([select Id,ProductCode,Name,Brand__c,Stock_Quantity__c from Product2 where Name LIKE :'%'+searchVal+'%' AND Id IN :proIdList]);
        // list<PricebookEntry> priceBookEntryIdList=[select Id,Product2Id,UnitPrice from PricebookEntry where Product2Id IN :productList.keySet() AND Pricebook2Id=:priceBookId];
        map<Id,String> priceBookList=new map<Id,String>();
        map<Id,Decimal> unitPriceList=new map<Id,Decimal>();
        for(PricebookEntry item:priceBookEntryIdList){
            priceBookList.put(item.Product2Id,item.Id);
            unitPriceList.put(item.Product2Id,item.UnitPrice);
        }
        String str='[';
        for(Id key:productList.keySet()){
            str+='{"Id":"'+key+'","'+'Name":"'+productList.get(key).Name+'","'+'ProductCode":"'+productList.get(key).ProductCode+'","'+'ListPrice":"'+unitPriceList.get(key)+'","'+'Quantity":"","Brand__c":"'+productList.get(key).Brand__c+'","'+'Stock_Quantity__c":"'+productList.get(key).Stock_Quantity__c+'","'+'PriceBookEntryId":"'+priceBookList.get(key)+'"}'+',';
        }
        str = str.substring(0, str.length()-1);
        str+=']';
        if(str.equals(']')){
            str='';
        }
        return str;
    }

    @AuraEnabled(cacheable=true)
    public static String getPriceBookId(String conId){
        List<Contract> conList = new List<Contract>();
        conList = [SELECT Pricebook2Id FROM Contract WHERE Id =: conId];
        String pbId = conList[0].Pricebook2Id;
        // pbId = pbId + conList[0];
        system.debug(pbId);
        return pbId;
    }

    // @AuraEnabled(cacheable=true)
    // public static String getContractNumber(String conId){
    //     List<Contract> conList = new List<Contract>();
    //     conList = [SELECT ContractNumber FROM Contract where Id =: conId];
    //     String conNum = conList[0].ContractNumber;
    //     // pbId = pbId + conList[0];
    //     system.debug(conNum);
    //     return conNum;
    // }

    @AuraEnabled
    public static String createOrder(String selectedProducts,String priceBookId, String accountId, String conId){
        list<ProductDetail> productList=new list<ProductDetail>();
        JSONParser parser = JSON.createParser(selectedProducts);
        while (parser.nextToken() != null) {
            if (parser.getCurrentToken() == JSONToken.START_ARRAY) {
                while (parser.nextToken() != null) {
                    if (parser.getCurrentToken() == JSONToken.START_OBJECT) {
                        ProductDetail acc = (ProductDetail)parser.readValueAs(ProductDetail.class);
                        system.debug('Id:' + acc.Id + ' Name:' + acc.Name);
                        productList.add(acc);
                    }
                }
            }
        }
        Order order=new Order(AccountId=accountId,EffectiveDate=date.today(),Status='Draft',Pricebook2Id=priceBookId,ContractId=conId);
        insert order;
        list<OrderItem> orderItemList = new list<OrderItem>();
        for(ProductDetail product:productList){
            orderItemList.add(new OrderItem(OrderId=order.Id,Product2Id=product.Id,Quantity=Decimal.valueOf(product.Quantity),UnitPrice=Decimal.valueOf(product.UnitPrice),PricebookEntryId=product.PriceBookEntryId,Brand__c=product.Brand,Product_Name__c=product.Name,Product_Code__c=product.ProductCode));
        }
        insert orderItemList;
        return order.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<OrderItem> getList(String oId) {
        return [SELECT Id, Brand__c, Product_Name__c, Product_Code__c, Quantity, TotalPrice FROM OrderItem where OrderId=:oId];
    }

    @AuraEnabled
    public static void deleteRecord(String recId) {
        // List<OrderItem> oiList=new List<OrderItem>();
        // OrderItem[] oiList = [select Id, Quantity from OrderItem where Id IN :rec];
        // delete oiList;
        delete new OrderItem(Id = recId);
    }

    @AuraEnabled
    public static string updateRec(String oid, String reason) {
        Order o = [select Order_Stages__c, Order_Remarks__c from order where Id =: oid];
        o.Order_Stages__c = 'Cancelled';
        o.Order_Remarks__c = reason;
        update o;
        return 'true';
    }

    @AuraEnabled
    public static string updateStage(String oid) {
        Order o = [select Order_Stages__c from order where Id =: oid];
        o.Order_Stages__c = 'Saved';
        update o;
        return 'true';
    }

    // @AuraEnabled(cacheable=true)
    // public static list<Order> getOrderDetails(String oId){
    //     return [select Id, OrderNumber, TotalAmount from order where Id =: oId];
    // }

    @AuraEnabled
    public static string updateStock(String oid){
        List<OrderItem> oList=new List<OrderItem>();
        oList = [select Product2Id, Quantity from OrderItem where OrderId=:oid];
        // List<Product2> proList = new List<Product2>();
        for (OrderItem oi : oList) {
            Product2 p = [select Id, Stock_Quantity__c from Product2 where Id=:oi.Product2Id];
            p.Stock_Quantity__c = p.Stock_Quantity__c - oi.Quantity;
            update p;
        }
        return 'Operation Successful';
    }
}


    