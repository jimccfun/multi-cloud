import { Component, OnInit } from '@angular/core';
import { Router,ActivatedRoute} from '@angular/router';
import { I18NService, Utils ,HttpService,Consts} from 'app/shared/api';
import { BucketService} from '../buckets.service';
// import { FileUploader } from 'ng2-file-upload';
import { MenuItem ,ConfirmationService} from '../../../components/common/api';
import { HttpClient } from '@angular/common/http';
import {XHRBackend, RequestOptions, Request, RequestOptionsArgs, Response, Headers, BaseRequestOptions } from '@angular/http';
import { FormControl, FormGroup, FormBuilder, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { BaseRequestOptionsArgs } from 'app/shared/service/api';
declare let X2JS:any;
@Component({
  selector: 'bucket-detail',
  templateUrl: './bucket-detail.component.html',
  styleUrls: [

  ],
  providers: [ConfirmationService],
})
export class BucketDetailComponent implements OnInit {
  selectFile;
  label;
  uploadFileDispaly:boolean = false;
  buketName:string="";
  bucketId:string="";
  items = [{
    label:"Buckets",
    url:["/block","fromBuckets"]
  }];
  allDir = [];
  selectedDir = [];
  uploadDisplay = false;
  selectedSpecify = [];
  showBackend = false;
  allTypes = [];
  backendsOption = [];
  selectType:any;
  selectBackend:any;
  bucket;
  showCreateFolder = false;
  createFolderForm:FormGroup;
  errorMessage = {
    "name": { required: "Name is required." },
    "description": { maxlength: "Max. length is 200." },
    "repName":{ required: "Name is required." },
    "profileOption":{ required: "Name is required." },
    "expandSize":{required: "Expand Capacity is required."}
  };
  constructor(
    private ActivatedRoute: ActivatedRoute,
    public I18N:I18NService,
    private BucketService: BucketService,
    private confirmationService: ConfirmationService,
    private http: HttpService,
    private fb:FormBuilder,
    private httpClient:HttpClient
  ) 
  {
    this.createFolderForm = this.fb.group({
      "name": ['', Validators.required]
    });
  }

  ngOnInit() {
    this.ActivatedRoute.params.subscribe((params) => {
      this.bucketId = params.bucketId;
      this.items.push({
        label: this.bucketId,
        url: ["bucketDetail", this.bucketId],
      });
      this.getAlldir();
      this.allTypes = [];
      this.getTypes();
    }
    );
  }
  getAlldir(){
    this.BucketService.getBucketById(this.bucketId).subscribe((res) => {
      let str = res._body;
      let x2js = new X2JS();
      let jsonObj = x2js.xml_str2json(str);
      let alldir = jsonObj.ListObjectResponse.ListObjects ? jsonObj.ListObjectResponse.ListObjects :[] ;
      if(Object.prototype.toString.call(alldir) === "[object Array]"){
          this.allDir = alldir;
      }else if(Object.prototype.toString.call(alldir) === "[object Object]"){
          this.allDir = [alldir];
      }
      this.allDir.forEach(item=>{
        item.size = Utils.getDisplayCapacity(item.Size,2,'KB')
      });
    });
  }
  getTypes() {
    this.allTypes = [];
    this.BucketService.getTypes().subscribe((res) => {
        res.json().types.forEach(element => {
            this.allTypes.push({
                label: element.name,
                value: element.name
            })
        });
    });
  }
  getBackendsByTypeId() {
    this.backendsOption = [];
    this.BucketService.getBackendsByTypeId(this.selectType).subscribe((res) => {
        let backends = res.json().backends ? res.json().backends :[];
        backends.forEach(element => {
            this.backendsOption.push({
                label: element.name,
                value: element.name
            })
        });
    });
  }
  showDetail(){
    if(this.selectedSpecify.length !== 0){
      this.showBackend = true;
    }else{
      this.showBackend = false;
    }
  }
  selectedFileOnChanged(event: any) {
    if(event.target.files[0]){
      let file = event.target.files[0];
      this.selectFile = file;
    }
  }

  uploadPart(uploadId,options){
    let totalSlices;
    let start = 0;
    let end;
    let index = 0;
    totalSlices = Math.ceil(this.selectFile['size'] / Consts.BYTES_PER_CHUNK);
    let proArr = [];
    while(start < this.selectFile['size']) {
      end = start + Consts.BYTES_PER_CHUNK;
      if(end > this.selectFile['size']) {
        end = this.selectFile['size'];
      }
      proArr.push(this.uploadload(this.selectFile, index, start, end,uploadId,options));
      start = end;
      index++;
      if ( index>=totalSlices ){
        // thrid step put all
        Promise.all(proArr).then(result=>{
          console.log(result);
          let x2js = new X2JS();
          let partArr = [];
          result.forEach(item =>{
            let jsonObj = x2js.xml_str2json(item['_body']);
            partArr.push(jsonObj);
          });
          let marltipart = '<CompleteMultipartUpload>';
          partArr.forEach(item =>{
            marltipart +=`<Part>
                  <PartNumber>${item.UploadPartResult.PartNumber}</PartNumber>
                 <ETag>${item.UploadPartResult.ETag}</ETag>
                 </Part>`
          });
          marltipart += '</CompleteMultipartUpload>';
          this.BucketService.uploadFile(this.bucketId+'/'+ this.selectFile.name+'?uploadId='+uploadId,marltipart,options).subscribe((res) => {
            this.getAlldir();
          });
        });
      }
    }
  }
  uploadload(blob, index, start, end,uploadId,options) {
    let fd;
    let chunk;  
    chunk =blob.slice(start,end);
    fd = new FormData();
    fd.append("UpgradeFileName", chunk);
    return this.BucketService.uploadFile(`${this.bucketId}/${blob.name}?partNumber=${index+1}&uploadId=${uploadId}`,fd,options).toPromise();
  }
  uploadFile() {
    let headers = new Headers();
    headers.append('Content-Type', 'application/xml');
    if(this.selectBackend){
      headers.append('x-amz-storage-class',this.selectBackend);
    }
    let options = {
      headers: headers,
      timeout:Consts.TIMEOUT
    };
    if(this.selectFile['size'] > Consts.BYTES_PER_CHUNK){
      //first step get uploadId
      this.BucketService.uploadFile(this.bucketId+'/'+ this.selectFile.name + "?uploads",options).subscribe((res) => {
        let str = res['_body'];
        let x2js = new X2JS();
        let jsonObj = x2js.xml_str2json(str);
        let uploadId = jsonObj.InitiateMultipartUploadResult.UploadId;
        // second step part upload
        this.uploadDisplay = false;
        this.uploadPart(uploadId,options);
      });
      return;
    }
    let form = new FormData();
    form.append("file", this.selectFile,this.selectFile.name);
    this.BucketService.uploadFile(this.bucketId+'/'+ this.selectFile.name,form,options).subscribe((res) => {
      this.uploadDisplay = false;
      this.getAlldir();
    });
  }

  downloadFile(file) {
    this.httpClient.get(`v1/s3/${this.bucketId}/${file.ObjectKey}`, {responseType: 'arraybuffer'}).subscribe((res)=>{
      let blob = new Blob([res]);
      if (typeof window.navigator.msSaveBlob !== 'undefined') {  
          window.navigator.msSaveBlob(blob, file.ObjectKey);
      } else {
        let URL = window.URL
        let objectUrl = URL.createObjectURL(blob)
        if (file.ObjectKey) {
          var a = document.createElement('a')
          a.href = objectUrl
          a.download = file.ObjectKey
          document.body.appendChild(a)
          a.click()
          a.remove()
        }
      }
    });
  }
  showDialog(from){
    switch(from){
      case 'fromFolder':
        this.createFolderForm.reset();
        this.showCreateFolder = true;
        break;
    }
  }
  createFolder(){
    if(!this.createFolderForm.valid){
      for(let i in this.createFolderForm.controls){
          this.createFolderForm.controls[i].markAsTouched();
      }
      return;
    }
    this.BucketService.uploadFile(this.bucketId+'/test/').subscribe((res) => {
      this.showCreateFolder = false;
      this.getAlldir();
    });
  }
  deleteMultiDir(){
    let msg = "<div>Are you sure you want to delete the Files ?</div><h3>[ "+ this.selectedDir.length +" ]</h3>";
    let header ="Delete";
    let acceptLabel = "Delete";
    let warming = true;
    this.confirmDialog([msg,header,acceptLabel,warming,"deleteMilti"],this.selectedDir);
  }
  deleteFile(file){
    let msg = "<div>Are you sure you want to delete the File ?</div><h3>[ "+ file.ObjectKey +" ]</h3>";
    let header ="Delete";
    let acceptLabel = "Delete";
    let warming = true;
    this.confirmDialog([msg,header,acceptLabel,warming,"delete"], file)
  }

  confirmDialog([msg,header,acceptLabel,warming=true,func], file){
      this.confirmationService.confirm({
          message: msg,
          header: header,
          acceptLabel: acceptLabel,
          isWarning: warming,
          accept: ()=>{
              try {
                switch(func){
                  case "delete":
                    let objectKey = file.ObjectKey;
                    this.BucketService.deleteFile(`/${this.bucketId}/${objectKey}`).subscribe((res) => {
                        this.getAlldir();
                    });
                    break;
                  case "deleteMilti":
                   file.forEach(element => {
                      let objectKey = element.ObjectKey;
                      this.BucketService.deleteFile(`/${this.bucketId}/${objectKey}`).subscribe((res) => {
                        this.getAlldir();
                      });
                   });
                    break;
                }
              }
              catch (e) {
                  console.log(e);
              }
              finally {
                  
              }
          },
          reject:()=>{}
      })
  }
  tablePaginate() {
      this.selectedDir = [];
  }

}
