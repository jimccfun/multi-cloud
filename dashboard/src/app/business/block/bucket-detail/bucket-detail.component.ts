import { Component, OnInit } from '@angular/core';
import { Router,ActivatedRoute} from '@angular/router';
import { I18NService, Utils } from 'app/shared/api';
import { BucketService} from '../buckets.service';
// import { FileUploader } from 'ng2-file-upload';
import { MenuItem ,ConfirmationService} from '../../../components/common/api';
import { HttpClient } from '@angular/common/http';

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
  // private uploader: FileUploader;
  constructor(
    private ActivatedRoute: ActivatedRoute,
    public I18N:I18NService,
    private BucketService: BucketService,
    private confirmationService: ConfirmationService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.ActivatedRoute.params.subscribe((params) => {
      // this.uploader = new FileUploader({
      //   url: 'v1beta/file/upload' + "?bucket_id=" + params.bucketId,
      //   method: 'POST',
      //   itemAlias: "uploadedfile",
      //   autoUpload: false
      // })

      this.bucketId = params.bucketId;
      this.BucketService.getBucketById(this.bucketId).subscribe((res) => {
        this.bucket = res.json();
        this.buketName = this.bucket.name;
        this.items.push({
          label: this.buketName,
          url: ["bucketDetail", this.buketName],
        });
      });
      this.allTypes = [];
      this.getFile();
      this.getTypes();
    }
    );
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
  getFile() {
    this.selectedDir = [];
    this.BucketService.getFilesByBucketId(this.bucketId).subscribe((res) => {
      this.allDir = res.json();
      this.allDir.forEach(element => {
        element.last_modified = (element.last_modified.substring(0,19)).replace("T"," ");
        element.size = Utils.getDisplayCapacity(element.size, 2, "KB");
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

    /**
   * 上传文件内容变化时执行的方法
   * @param event
   */
  selectedFileOnChanged(event: any) {
    // 这里是文件选择完成后的操作处理
    // alert('上传文件改变啦');
    if(event.target.files[0]){
      let file = event.target.files[0];
      this.selectFile = file;
    }
  }

  /**
   * 上传文件方法
   */
  uploadFile() {
    let form = new FormData();
    form.append("file", this.selectFile);
    
    
    this.BucketService.uploadFile(form).subscribe((res) => {
      let data = res.json();
      if(data.isExsit){
        alert("Exsit");
        this.uploadDisplay = false;
      }else{
        let params = {};
        params['name'] = data.originalFilename;
        params['size'] = data.size;
        params['bucketID'] = this.bucketId;
        if (!this.showBackend) {
          params['backendName'] = this.bucket.backend;
        } else {
          params['backendName'] = this.selectBackend;
        }
        this.BucketService.saveToDB(params).subscribe((res) => {
          this.uploadDisplay = false;
          this.getFile();
        })
      }
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
    let msg = "<div>Are you sure you want to delete the File ?</div><h3>[ "+ file.name +" ]</h3>";
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
                    let id = file._id;
                    this.BucketService.deleteFile(id).subscribe((res) => {
                        this.getFile();
                    });
                    break;
                  case "deleteMilti":
                   file.forEach(element => {
                      this.BucketService.deleteFile(element._id).subscribe((res) => {
                        this.getFile();
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
