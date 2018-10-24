import { Component, OnInit } from '@angular/core';
import { Router,ActivatedRoute} from '@angular/router';
import { I18NService, Utils } from 'app/shared/api';
import { BucketService} from '../buckets.service';
// import { FileUploader } from 'ng2-file-upload';
import { MenuItem ,ConfirmationService} from '../../../components/common/api';
import { HttpClient } from '@angular/common/http';
import {XHRBackend, RequestOptions, Request, RequestOptionsArgs, Response, Headers, BaseRequestOptions } from '@angular/http';
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
  constructor(
    private ActivatedRoute: ActivatedRoute,
    public I18N:I18NService,
    private BucketService: BucketService,
    private confirmationService: ConfirmationService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.ActivatedRoute.params.subscribe((params) => {
      this.bucketId = params.bucketId;
      this.items.push({
        label: this.bucketId,
        url: ["bucketDetail", this.bucketId],
      });
      this.getAlldir();
      this.allTypes = [];
      // this.getTypes();
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
    });
  }
  getTypes() {
    this.allTypes = [];
    this.BucketService.getTypes().subscribe((res) => {
        res.json().forEach(element => {
            this.allTypes.push({
                label: element.name,
                value: element.id
            })
        });
    });
  }
  getBackendsByTypeId() {
    this.backendsOption = [];
    this.BucketService.getBackendsByTypeId(this.selectType).subscribe((res) => {
        res.json().forEach(element => {
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
  uploadFile() {
    let form = new FormData();
    form.append("file", this.selectFile,this.selectFile.name);
    let headers = new Headers();
    headers.append('Content-Type', 'application/xml');
    let options = new RequestOptions({ headers: headers });
    this.BucketService.uploadFile(this.bucketId+'/'+ this.selectFile.name,form,options).subscribe((res) => {
      this.uploadDisplay = false;
      this.getAlldir();
    });
  }

  downloadFile(file) {
    this.http.get('v1beta/{project_id}/file/download?file_name=' + file.name, {responseType: 'arraybuffer'}).subscribe((res) => {
      let blob = new Blob([res])
      if (typeof window.navigator.msSaveBlob !== 'undefined') {  
          window.navigator.msSaveBlob(blob, file.name);
      } else {
        let URL = window.URL
        let objectUrl = URL.createObjectURL(blob)
        if (file.name) {
          var a = document.createElement('a')
          a.href = objectUrl
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          a.remove()
        }
      }
    });
  }
  deleteMultiDir(){
    console.log(this.selectedDir);
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
