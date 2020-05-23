import { LightningElement, wire, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
// import { getRecords } from 'lightning/uiRecordApi';
import getPriceBookId from '@salesforce/apex/OrderDemoController.getPriceBookId';
import getProducts from '@salesforce/apex/OrderDemoController.getProducts';
import createOrder from '@salesforce/apex/OrderDemoController.createOrder';
import getList from '@salesforce/apex/OrderDemoController.getList';
import updateRec from '@salesforce/apex/OrderDemoController.updateRec';
import updateStage from '@salesforce/apex/OrderDemoController.updateStage';
import updateStock from '@salesforce/apex/OrderDemoController.updateStock';
// import getContractNumber from '@salesforce/apex/OrderDemoController.getContractNumber';
//Order Summary imports.
import { updateRecord } from 'lightning/uiRecordApi';
import { deleteRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import ORDERITEM_ID from '@salesforce/schema/OrderItem.Id';
import ORDERITEM_QUANTITY from '@salesforce/schema/OrderItem.Quantity';
// import getOrderDetails from '@salesforce/apex/OrderDemoController.getOrderDetails';

const COLS = [ 
    { label: 'OrderItem Id', fieldName: 'Id' },
    { label: 'Brand', fieldName: 'Brand__c', type: 'text' },
    { label: 'Product Code', fieldName: 'Product_Code__c', type: 'text' },
    { label: 'Product Name', fieldName: 'Product_Name__c', type:'text' },
    { label: 'OrderItem Quantity', fieldName: 'Quantity', editable: true , type: 'number'},
    { label: 'Total Price', fieldName: 'TotalPrice', type: 'currency' }
];

export default class OrderDemo extends LightningElement {

    accId;
    conId;
    pbId;
    oId;
    res;
    flag=0;
    // conNum;
    productList;
    searchVal;
    showSearchList=false;
    selectedProductList=[];
    finalSelectedProductList=[];
    selectedTableToggle=true;
    showFinalTable=false;
    showSearchBar=false;
    orderPlaced=false;

    @track value = '';

    handlechange(event){
        this.value = event.target.value;
    }
    
    get options() {
        return [
            { label: 'Name', value: 'Name' },
            { label: 'Product Code', value: 'Product Code'},
            { label: 'Brand', value: 'Brand' },
            {label:'MRP', value: 'MRP'}
        ];
    }

    handleSuccess(event) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: event.detail.apiName + ' created.',
                variant: 'success',
            }),
        );
    }

    handleAccountChange(event) {
        this.accId = event.detail.value[0];
        console.log("You selected an account: " + this.accId);
    }

    handleContractChange(event) {
        this.conId = event.detail.value[0];
        console.log("You selected a contract: " + this.conId);
    }

    @wire(getPriceBookId, { conId: '$conId' })
    pbId;

    // @wire(getContractNumber, { conId: '$conId'})
    // conNum;

    showData() {
        console.log(this.pbId.data);
        this.showSearchBar=true;
        // console.log(this.conNum.data);
    }

    handleSearch(event){
        if(event.target.value.length!=0){
            getProducts({searchVal:event.target.value,priceBookId:this.pbId.data,inSearch: this.value})
            .then(result=>{
                this.productList=JSON.parse(result);
                this.showSearchList=true;
            })
            .catch(error => {
                // display server exception in toast msg 
                const event = new ShowToastEvent({
                    title: 'Error',
                    variant: 'error',
                    message: error.body.message,
                });
                this.dispatchEvent(event);
                // reset products var with null   
                this.productList = null;
                this.showSearchList=false;
            });
            
        }
        if(event.target.value.length==0){
            this.showSearchList=false;
        }
    }

    addProduct(event){
        this.selectedTableToggle=false;
        var id=event.target.value;
        var index = -1;
        var selectedproduct=new Object();
        for(var product of this.productList){
            index++;
            if(id==product.Id){
                selectedproduct.Id=product.Id;
                selectedproduct.Name=product.Name;
                selectedproduct.ProductCode=product.ProductCode;
                selectedproduct.Brand=product.Brand__c;
                selectedproduct.Stock_Quantity=product.Stock_Quantity__c;
                selectedproduct.Quantity='1';
                selectedproduct.UnitPrice=0;
                selectedproduct.ListPrice=product.ListPrice;
                selectedproduct.Discount=0;
                selectedproduct.PriceBookEntryId=product.PriceBookEntryId;
                break;
            }
        }
        if(!this.selectedProductList.some(item => item.Id === selectedproduct.Id)){
            this.selectedProductList.push(selectedproduct);
        }
        this.showSearchList=false;
        this.selectedTableToggle=true;
    }

    updateQuantity(event){
        var index = -1;
        for(var product of this.selectedProductList){
            index++;
            if(event.target.name==product.Id){
                break;
            }
        }
        if(Number(this.selectedProductList[index].Stock_Quantity)<Number(event.target.value)) {
            const evt = new ShowToastEvent({
                title: 'Error',
                message: 'Error che.',
                variant: 'error',
            });
            this.dispatchEvent(evt);
            console.log('Error');
            event.target.value = '';
            alert('Quantity should be less then Stock Quantity');
        } else {
            this.selectedProductList[index].Quantity=event.target.value;
        }
    }

    updateDiscount(event){
        var index = -1;
        for(var product of this.selectedProductList){
            index++;
            if(event.target.name==product.Id){
                break;
            }
        }
        this.selectedProductList[index].Discount=event.target.value;
    }

    removeClicked(event){
        var id=event.target.value;
        for(var product of this.selectedProductList){
            if(id==product.Id){
                const index = this.selectedProductList.indexOf(product);
                this.selectedProductList.splice(index,1)
            }
        }
        this.selectedTableToggle=false;
        this.selectedTableToggle=true;
    }
    
    saveClicked(){
        this.selectedTableToggle=false;
        for(var product of this.selectedProductList){
            var selectedproduct=new Object();
            
            if(product.Quantity>10 && product.Quantity!=product.Stock_Quantity){
                //let x = product.Quantity/10;
                selectedproduct.Id=product.Id;
                selectedproduct.Name=product.Name;
                selectedproduct.ProductCode=product.ProductCode;
                selectedproduct.Brand=product.Brand;
                selectedproduct.Stock_Quantity=product.Stock_Quantity - '1';
                selectedproduct.Quantity='1';
                selectedproduct.ListPrice=0;
                selectedproduct.UnitPrice=0;
                selectedproduct.Discount=100;
                selectedproduct.PriceBookEntryId=product.PriceBookEntryId;
                this.selectedProductList.push(selectedproduct);
            }
            console.log(selectedproduct);
            product.UnitPrice=product.ListPrice - (product.ListPrice * product.Discount / 100);
        }

        this.showFinalTable=true;
    }

    placeOrder(event) {
        createOrder({selectedProducts:JSON.stringify(this.selectedProductList),priceBookId:this.pbId.data,accountId:this.accId,conId:this.conId})
        .then(result=>{
            console.log('Order Id : ' + result);
            this.oId=result;
        });
        console.log(this.selectedProductList);
        this.orderPlaced=true;
    }

    handleClick() {
        this.selectedProductList = [];
    }


    //Order Summary Code.
    @track error;
    @track columns = COLS;
    @track co = COLLS;
    @track draftValues = [];
    @track recId;
    @track openmodel = false;
    allowCancel = false;
    reason;
    @track recordId = this.oId;

    // @track recId;

    @wire(getList, { oId: '$oId' })
    emps;

    // @wire(getOrderDetails, { oId: '$oId' })
    // orderDetails;

    handleClickAdd() {

        var el = this.template.querySelector('lightning-datatable');
        var selected = el.getSelectedRows();
        let selectedIdsArray = [];

        for (const element of selected) {
            //console.log('elementid', element.Id);
            selectedIdsArray.push(element.Id);
        }
        this.recId = selectedIdsArray[0];
        console.log(this.recId);
    }

    deleteRec(event) {
        deleteRecord(this.recId)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Record deleted',
                        variant: 'success'
                    })
                );
                return refreshApex(this.emps);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting record',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
            //location.reload();
    }

    handleSave(event) {
        const fields = {};
        fields[ORDERITEM_ID.fieldApiName] = event.detail.draftValues[0].Id;
        fields[ORDERITEM_QUANTITY.fieldApiName] = event.detail.draftValues[0].Quantity;

        const recordInput = {fields};

        updateRecord(recordInput)
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Data updated',
                    variant: 'success'
                })
            );
            // Clear all draft values
            this.draftValues = [];

            // Display fresh data in the datatable
            return refreshApex(this.emps);
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating record',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        });
    }

    delay = 5000;
    confirmOrder() {
        // alert('Order placed successfully');
        updateStock({oid: this.oId})
        .then(result=>{
            console.log(result);
        });

        updateStage({oid: this.oId})
        .then(result=>{
            console.log('Order placed : ' + result);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Order Placed Successfully',
                    variant: 'success'
                })
            );
            setTimeout(location.reload(), delay);
        }); 


    }

    cancelOrder() {
        this.openmodel = true;
    }

    handleData(event) {
        if(event.target.value.length!=0) {
            this.reason = event.target.value;
        }
    }

    saveMethod(event) {
        if(this.reason.length!=0) {
            // alert('Order cancelled successfully');
            updateRec({oid: this.oId, reason: this.reason})
            .then(result=>{
                console.log('Order cancelled : ' + result);
                this.closeModal();
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Order Cancelled',
                        message: 'Order Cancelled Successfully',
                        variant: 'error'
                    })
                );
                setTimeout(location.reload(), delay);
            });
            // this.allowCancel=true;
        }
        else {
            alert('Order Remarks filed is mandatary, Please enter the remarks');
        }
    }

    cancelInput(event) {
        this.closeModal();
    }

    closeModal() {
        this.openmodel = false;
    } 

}
