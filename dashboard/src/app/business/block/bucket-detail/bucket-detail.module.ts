import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BucketDetailComponent } from './bucket-detail.component';

import { TabViewModule,ButtonModule, DataTableModule, DropMenuModule, DialogModule, FormModule, InputTextModule, InputTextareaModule, 
  ConfirmDialogModule ,ConfirmationService,CheckboxModule,DropdownModule} from './../../../components/common/api';
import { HttpService } from './../../../shared/service/Http.service';
import { BucketService } from '../buckets.service';
// import { FileUploadModule } from 'ng2-file-upload';
import { HttpClientModule } from '@angular/common/http';

let routers = [{
  path: '',
  component: BucketDetailComponent
}]

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    InputTextareaModule,
    RouterModule.forChild(routers),
    TabViewModule,
    ButtonModule,
    DataTableModule,
    DialogModule,
    FormModule,
    ConfirmDialogModule,
    CheckboxModule,
    DropdownModule,
    // FileUploadModule
    HttpClientModule
  ],
  declarations: [
    BucketDetailComponent
  ],
  providers: [
    HttpService,
    ConfirmationService,
    BucketService
  ]
})
export class BucketDetailModule { }
