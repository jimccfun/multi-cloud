import { Component, OnInit, ViewContainerRef, ViewChild, Directive, ElementRef, HostBinding, HostListener } from '@angular/core';
import { Http } from '@angular/http';
import { ParamStorService } from 'app/shared/api';
import { ProfileService } from 'app/business/profile/profile.service';
import { Observable } from "rxjs/Rx";
import { I18NService } from 'app/shared/api';
import { ReactiveFormsModule, FormsModule,FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { MenuItem ,ConfirmationService,ConfirmDialogModule} from '../../components/common/api';
import { Router } from '@angular/router';

@Component({
    templateUrl: './home.component.html',
    styleUrls: [
        './home.component.scss'
    ]
})
export class HomeComponent implements OnInit {
    items = [];
    chartDatas;
    chartDatasbar;
    option;
    chartBarOpion;
    profileOptions = [];
    lineData_nums;
    lineData_capacity;
    showAdminStatis = true;
    tenants =[];
    lineData ={};
    lineOption = {};
    showRgister = false;
    allTypes = [];
    allRegions = [];
    showBackends = false;
    allBackends={
        aws:0,
        huaweipri:0,
        huaweipub:0
    }
    counts= {
        volumesCount:0,
        bucketsCount:0,
        migrationCount:0
    }
    typeJSON ={};
    backendForm :FormGroup;
    typeDetail = [];
    selectedType:any;
    typeDropdown:any;
    selectedRegions = [];

    @ViewChild("path") path: ElementRef;
    @ViewChild("cloud_aws") c_AWS: ElementRef;
    @ViewChild("cloud_hw") c_HW: ElementRef;
    @ViewChild("cloud_hw_p") c_HWP: ElementRef;
    @ViewChild("svgCon") svgCon: ElementRef;
    
    scaleX = 1;
    scaleY = 1;

    constructor(
        private http: Http,
        private paramStor: ParamStorService,
        private profileService: ProfileService,
        public I18N: I18NService,
        private fb:FormBuilder,
        private ConfirmationService:ConfirmationService,
        private router: Router,
    ) { }

    ngOnInit() {
        if(this.paramStor.CURRENT_USER().split("|")[0] == "admin"){
            this.showAdminStatis = true;
            // this.getCountData();
        }else{
            this.showAdminStatis = false;
            this.getTenantCountData();
        }
        this.getCounts();
        this.getType();
        this.listStorage();
        this.backendForm = this.fb.group({
            "name":[],
            "type":[],
            "region":[],
            "endpoint":[],
            "bucket":[],
            "ak":[],
            "sk":[],
        });
        this.items = [
            {
                countNum: 0,
                label: this.I18N.keyID["sds_home_tenants"]
            },
            {
                countNum:0,
                label: this.I18N.keyID["sds_home_users"]
            },
            {
                countNum: 0,
                label: this.I18N.keyID["sds_home_storages"]
            },
            {
                countNum: 0,
                label: this.I18N.keyID["sds_home_pools"]
            },
            {
                countNum: 0,
                label: this.I18N.keyID["sds_home_volumes"]
            },
            {
                countNum: 0,
                label:this.I18N.keyID["sds_home_snapshots"]
            },
            {
                countNum: 0,
                label: this.I18N.keyID["sds_home_replications"]
            },
            {
                countNum: 0,
                label: "Cross-Region Replications"
            },
            {
                countNum: 0,
                label: "Cross-Region Migrations"
            }
        ];

        
        this.option = {
            cutoutPercentage: 80,
            title: {
                display: false,
                text: 'My Title',
                fontSize: 12
            },
            legend: {
                labels: {
                    boxWidth: 12
                },
                display: true,
                position: 'right',
                fontSize: 12
            }
        };
        this.chartBarOpion= {
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0,
                    }
                }]
            },
            legend: {
                display: false
            }
        }

        this.lineData_capacity = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: 'Capacity(GB)',
                    data: [10, 11, 20, 160, 156, 195, 200],
                    fill: false,
                    borderColor: '#4bc0c0'
                }
            ]
        }

        this.lineData_nums = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: 'Volumes',
                    data: [10, 23, 40, 38, 86, 107, 190],
                    fill: false,
                    borderColor: '#565656'
                }
            ]
        }
        this.lineOption = {
            title: {
                display: false,
                text: 'My Title',
                fontSize: 12
            },
            legend: {
                labels: {
                    boxWidth: 12
                },
                display: false,
                position: 'right',
                fontSize: 12
            }
        };
        this.lineData = {
            labels: [[], [], [], [], [],[],[]],
            datasets: [
                {
                    //label: 'First Dataset',
                    data: [2,4,8,11,14,16,21],
                    fill: true,
                    borderColor: '#4bc0c0'
                }
            ]
        }
        this.allRegions = [[{
            label:'us-west-1',
            value:'us-west-1'
        },
        {
            label:'us-west-2',
            value:'us-west-2'
        },
        {
            label:'us-east-1',
            value:'us-east-1'
        },
        {
            label:'us-east-2',
            value:'us-east-2'
        }],[{
            label:'cn-north-2',
            value:'cn-north-2'
        },
        {
            label:'cn-south-1',
            value:'cn-south-1'
        }],[{
            label:'AP-Hong Kong',
            value:'AP-Hong Kong'
        },
        {
            label:'CN North-Beijing1',
            value:'CN North-Beijing1'
        },
        {
            label:'CN South-Guangzhou',
            value:'CN South-Guangzhou'
        }]];

        let that = this;
        document.body.onmousemove = function(e){
            let initPos = 350;
            let svgConW = that.svgCon.nativeElement.offsetWidth, svgConH = that.svgCon.nativeElement.offsetHeight;
            let winW = document.documentElement.offsetWidth, winH = document.documentElement.offsetHeight;
            let disX = 10, disY = 1;
            let moveX = e.pageX * disX / (winW-320)*0.5, moveY = e.pageY * disY / winH;
            that.scaleX = svgConW/240; // 240为svg原始宽度
            that.scaleY = 5; //5.5 - moveY; 

            let clouds = [that.c_AWS.nativeElement, that.c_HW.nativeElement, that.c_HWP.nativeElement];
            clouds.forEach((item, index) => {
              let totalLength = that.path.nativeElement.getTotalLength();
              let point = totalLength/clouds.length * (index+1) + moveX + initPos;
                  if(point > totalLength) point = point - totalLength;
                  if(point < 0) point = totalLength - point;
              
              let pos = that.path.nativeElement.getPointAtLength(point);
              item.style.left = (pos.x*that.scaleX - item.offsetWidth*0.5) +"px";
              item.style.top = (pos.y*that.scaleY + svgConH*(1 - that.scaleY)*0.5 - item.offsetHeight*0.6) +"px";
              item.style.display = "block";
            }) 
        }
    }

    getType(){
        let url = 'v1beta/{project_id}/type?page=1&limit=3';
        this.http.get(url).subscribe((res)=>{
            let all = res.json();
            console.log(all)
            all.forEach(element => {
                this.allTypes.push({
                    label:element.name,
                    value:element.id
                });
                this.typeJSON[element.id] = element.name;
            });
        });
    }
    changeRegion(){
        this.selectedRegions = this.allRegions[this.typeDropdown];
    }
    listStorage(){
       let  backendUrl = "v1beta/{project_id}/backend";
    //    this.http.get(backendUrl + "/count?type=0" ).subscribe((res)=>{
    //        this.allBackends.aws = res.json().count;
    //    });
    //    this.http.get(backendUrl + "/count?type=1").subscribe((res)=>{
    //         this.allBackends.huaweipri = res.json().count;
    //     });
    //     this.http.get(backendUrl + "/count?type=2").subscribe((res)=>{
    //         this.allBackends.huaweipub = res.json().count;
    //     });
    }
    getProfiles() {
        this.profileService.getProfiles().subscribe((res) => {
            let profiles = res.json();
            profiles.forEach(profile => {
                this.profileOptions.push({
                    name: profile.name,
                    id: profile.id,
                    capacity: 0
                })
            });
        });
    }

    listTenants() {
        let request: any = { params:{} };
        request.params = {
            "domain_id": "default"
        }

        this.http.get("/v3/projects", request).subscribe((res) => {

            this.items[0].countNum = res.json().projects.length;
            this.tenants = res.json().projects;
            this.tenants.forEach((item, i)=>{
                if(item.name == "admin"){
                    this.getAllvolumes(item.id, this.tenants.length - 1);
                    this.getAllSnapshots(item.id);
                    this.getAllReplications(item.id);
                    this.getAllPools(item.id);
                    this.getAllDocks(item.id);
                }
            });


        });
    }
    listUsers(){
        let request: any = { params:{} };
        request.params = {
            "domain_id": "default"
        }
        this.http.get("/v3/users", request).subscribe((res) => {
            this.items[1].countNum = res.json().users.length;
        });
    }
    getAllvolumes(projectId, index?){
        let url = 'v1beta/'+projectId+'/block/volumes';
        this.http.get(url).subscribe((res)=>{
            this.items[4].countNum = this.items[4].countNum + res.json().length;

            if(this.showAdminStatis){
                res.json().forEach(volume => {
                    this.profileOptions.forEach(profile => {
                        if(volume.profileId == profile.id){
                            profile.capacity = profile.capacity + volume.size;
                        }
                    });
                });

                if(index == (this.tenants.length-1)){
                    let [chartData, chartLabel] = [[],[]];
                    this.profileOptions.forEach(ele=>{
                        chartData.push(ele.capacity);
                        chartLabel.push(ele.name);
                    });

                    this.chartDatasbar = {
                        labels: chartLabel,
                        datasets: [{
                            label:"Used Capacity (GB)",
                            backgroundColor: '#42A5F5',
                            data: [chartData]
                        }]
                    }
                }
            }
        });
    }
    getAllSnapshots(projectId){
        let url = 'v1beta/'+projectId+'/block/snapshots';
        this.http.get(url).subscribe((res)=>{
            this.items[5].countNum = this.items[5].countNum + res.json().length;
        });
    }
    getAllReplications(projectId){
        let url = 'v1beta/'+projectId+'/block/replications';
        this.http.get(url).subscribe((res)=>{
            if(res.json()){
                this.items[6].countNum = this.items[6].countNum + res.json().length;
            }
        });
    }
    getAllPools(projectId){
        let url = 'v1beta/'+projectId+'/pools';
        this.http.get(url).subscribe((res)=>{
            this.items[3].countNum = this.items[3].countNum + res.json().length;

            let [storCapacityTotal, storCapacityFree]=[0,0];
            res.json().forEach(element => {
                storCapacityTotal = storCapacityTotal + element.totalCapacity;
                storCapacityFree = storCapacityFree + element.freeCapacity;
            });

            this.chartDatas = {
                labels: [this.I18N.keyID["sds_home_used_capacity"] + " (GB)",this.I18N.keyID["sds_home_free_capacity"] + " (GB)"],
                datasets: [
                    {
                        label: 'high_capacity',
                        data: [(storCapacityTotal-storCapacityFree), storCapacityFree],
                        backgroundColor: [
                            "#438bd3",
                            "rgba(224, 224, 224, .5)"
                        ]
                    }]
            };
        });
    }
    getAllDocks(projectId){
        let url = 'v1beta/'+projectId+'/docks';
        this.http.get(url).subscribe((res)=>{
            this.items[2].countNum = this.items[2].countNum + res.json().length;
        });
    }
    getCountData(){
        this.getProfiles();
        this.listTenants();
        this.listUsers();
    }

    getTenantCountData(){
        let tenantId = this.paramStor.CURRENT_TENANT().split("|")[1];
        this.getAllvolumes(tenantId);
        this.getAllSnapshots(tenantId);
        this.getAllReplications(tenantId);
    }
    showBackendsDeatil(type){
        this.showBackends = true;
        this.selectedType = type;
        let url = 'v1/{project_id}/backends/?type='+type;
        this.http.get(url).subscribe((res)=>{
            let types = res.json();
            types.forEach(element => {
                element.typeName = this.typeJSON[element.type];
                element.canDelete = false;
            });
            this.typeDetail = types;
            this.typeDetail.forEach(ele =>{
                this.http.get('v1beta/{project_id}/bucket/?backend='+ele.name).subscribe((resBuket)=>{
                    ele.canDelete = resBuket.json().length !== 0;
                    console.log(resBuket.json().length);
                });
            })
        });
    }
    deleteBackend(backend){
        if(backend.canDelete){
            let msg = "<div>you can't delete the backend with bucket</h3>";
            let header ="Prompt ";
            let acceptLabel = "Close";
            let warming = true;
            this.confirmDialog([msg,header,acceptLabel,warming,"close"])
        }else{
            let msg = "<div>Are you sure you want to delete the selected backend?</div><h3>[ "+ backend.name +" ]</h3>";
            let header ="Delete ";
            let acceptLabel = "Delete";
            let warming = true;
            this.confirmDialog([msg,header,acceptLabel,warming,backend])
        }
    }
    confirmDialog([msg,header,acceptLabel,warming=true,backend]){
        this.ConfirmationService.confirm({
            message: msg,
            header: header,
            acceptLabel: acceptLabel,
            isWarning: warming,
            accept: ()=>{
                try {
                    if(backend == "close"){
                        return;
                    }else{
                        let url = 'v1beta/{project_id}/backend/'+backend.id;
                        this.http.delete(url).subscribe((res)=>{
                            this.showBackendsDeatil(this.selectedType);
                            this.listStorage();
                        });
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
                            
    getCounts(){
        // let url1 = 'v1beta/{project_id}/block/volumes/count';
        // let url2 = 'v1beta/{project_id}/bucket/count';
        // let url3 = 'v1beta/{project_id}/migration/count';
        // this.http.get(url1).subscribe((res)=>{
        //     this.counts.volumesCount = res.json().count;
        // });
        // this.http.get(url2).subscribe((res)=>{
        //     this.counts.bucketsCount = res.json().count;
        // });
        // this.http.get(url3).subscribe((res)=>{
        //     this.counts.migrationCount = res.json().count;
        // });
    }
    // // 创建backend
    onSubmit(){
        let param = {
            "name": this.backendForm.value.name,
            "type": this.backendForm.value.type,
            "region": this.backendForm.value.region,
            "endpoint": this.backendForm.value.endpoint,
            "bucket": this.backendForm.value.bucket,
            "secretKey": this.backendForm.value.ak,
            "accessKey": this.backendForm.value.sk
        };
        this.http.post("v1beta/{project_id}/backend", param).subscribe((res) => {
            console.log(res);
            this.showRgister = false;
            this.listStorage();
        });
    }
    showRegister(){
        this.showRgister = true;
        this.backendForm.reset();
    }
}
