// Copyright (c) 2018 Huawei Technologies Co., Ltd. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package pkg

import (
	"context"
	"encoding/json"
	"errors"
	"os"

	"github.com/micro/go-log"
	c "github.com/opensds/multi-cloud/api/pkg/filters/context"
	"github.com/opensds/multi-cloud/dataflow/pkg/db"
	"github.com/opensds/multi-cloud/dataflow/pkg/job"
	"github.com/opensds/multi-cloud/dataflow/pkg/model"
	"github.com/opensds/multi-cloud/dataflow/pkg/plan"
	"github.com/opensds/multi-cloud/dataflow/pkg/policy"
	. "github.com/opensds/multi-cloud/dataflow/pkg/utils"
	pb "github.com/opensds/multi-cloud/dataflow/proto"
	"github.com/opensds/multi-cloud/datamover/proto"
)

type dataflowService struct {
	datamoverClient datamover.DatamoverService
}

func NewDataFlowService(datamover datamover.DatamoverService) pb.DataFlowHandler {
	host := os.Getenv("DB_HOST")
	dbstor := Database{Credential: "unkonwn", Driver: "mongodb", Endpoint: host}
	db.Init(&dbstor)

	return &dataflowService{datamoverClient: datamover}
}

func policyModel2Resp(policy *model.Policy) *pb.Policy {
	return &pb.Policy{
		Id:          policy.Id.Hex(),
		Name:        policy.Name,
		Description: policy.Description,
		Tenant:      policy.Tenant,
		Schedule: &pb.Schedule{
			Type:             policy.Schedule.Type,
			TiggerProperties: policy.Schedule.TriggerProperties,
		},
	}
}

func (b *dataflowService) GetPolicy(ctx context.Context, in *pb.GetPolicyRequest, out *pb.GetPolicyResponse) error {
	log.Log("Get policy is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	id := in.GetId()
	if id == "" {
		return errors.New("No id provided.")
	}

	p, err := policy.Get(actx, id)
	if err != nil {
		return err
	}
	out.Policy = policyModel2Resp(p)

	//For debug -- begin
	jsons1, errs1 := json.Marshal(out)
	if errs1 != nil {
		log.Logf(errs1.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons1)
	}
	//For debug -- end
	return err
}

func (b *dataflowService) ListPolicy(ctx context.Context, in *pb.ListPolicyRequest, out *pb.ListPolicyResponse) error {
	log.Log("List policy is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())

	pols, err := policy.List(actx)
	if err != nil {
		log.Logf("List policy err:%s.", err)
		return nil
	}

	for _, p := range pols {
		out.Policies = append(out.Policies, policyModel2Resp(&p))
	}

	//For debug -- begin
	jsons1, errs1 := json.Marshal(out)
	if errs1 != nil {
		log.Logf(errs1.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons1)
	}
	//For debug -- end
	return err
}

func (b *dataflowService) CreatePolicy(ctx context.Context, in *pb.CreatePolicyRequest, out *pb.CreatePolicyResponse) error {
	log.Log("Create policy is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	pol := model.Policy{}
	pol.Name = in.Policy.GetName()
	pol.Description = in.Policy.GetDescription()
	if in.Policy.GetSchedule() != nil {
		pol.Schedule.Type = in.Policy.Schedule.Type
		pol.Schedule.TriggerProperties = in.Policy.Schedule.TiggerProperties
	} else {
		out.Err = "Get schedule failed."
		return errors.New("Get schedule failed.")
	}

	if pol.Name == "" {
		out.Err = "no name provided."
		return errors.New("Get schedule failed.")
	}

	p, err := policy.Create(actx, &pol)
	if err != nil {
		log.Logf("Create policy err:%s.", out.Err)
		return nil
	}

	out.Policy = policyModel2Resp(p)
	return nil
}

func (b *dataflowService) DeletePolicy(ctx context.Context, in *pb.DeletePolicyRequest, out *pb.DeletePolicyResponse) error {
	log.Log("Delete policy is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	id := in.GetId()
	if id == "" {
		out.Err = "Get id failed."
		return errors.New("Get id failed.")
	}

	err := policy.Delete(actx, id)
	if err == nil {
		out.Err = ""
	} else {
		out.Err = err.Error()
	}
	log.Logf("Delete policy err:%s.", out.Err)

	return err
}

func (b *dataflowService) UpdatePolicy(ctx context.Context, in *pb.UpdatePolicyRequest, out *pb.UpdatePolicyResponse) error {
	log.Log("Update policy is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	policyId := in.GetPolicyId()
	if policyId == "" {
		return errors.New("No id provided.")
	}

	log.Logf("body:%s", in.GetBody())
	updateMap := map[string]interface{}{}
	if err := json.Unmarshal([]byte(in.GetBody()), &updateMap); err != nil {
		return err
	}

	p, err := policy.Update(actx, policyId, updateMap, b.datamoverClient)
	if err != nil {
		log.Logf("Update policy finished, err:%s", err)
		return err
	}
	out.Policy = policyModel2Resp(p)
	return nil
}

func fillRspConnector(out *pb.Connector, in *model.Connector) {
	switch in.StorType {
	case model.STOR_TYPE_OPENSDS:
		out.BucketName = in.BucketName
	default:
		log.Logf("Not support connector type:%v\n", in.StorType)
	}
}

func planModel2Resp(plan *model.Plan) *pb.Plan {

	resp := &pb.Plan{
		Id:            string(plan.Id.Hex()),
		Name:          plan.Name,
		Description:   plan.Description,
		Type:          plan.Type,
		PolicyId:      plan.PolicyId,
		PolicyName:    plan.PolicyName,
		PolicyEnabled: plan.PolicyEnabled,
		OverWrite:     plan.OverWrite,
		RemainSource:  plan.RemainSource,
		Tenant:        plan.Tenant,
	}

	srcConn := pb.Connector{StorType: plan.SourceConn.StorType}
	fillRspConnector(&srcConn, &plan.SourceConn)
	destConn := pb.Connector{StorType: plan.DestConn.StorType}
	fillRspConnector(&destConn, &plan.DestConn)

	filter := pb.Filter{Prefix: plan.Filter.Prefix}

	for _, t := range plan.Filter.Tag {
		tag := &pb.KV{Key: t.Key, Value: t.Value}
		filter.Tag = append(filter.Tag, tag)
	}
	resp.SourceConn = &srcConn
	resp.DestConn = &destConn
	resp.Filter = &filter
	return resp
}

func (b *dataflowService) GetPlan(ctx context.Context, in *pb.GetPlanRequest, out *pb.GetPlanResponse) error {
	log.Log("Get plan is called in dataflow service.")

	actx := c.NewContextFromJson(in.GetContext())
	id := in.GetId()
	if id == "" {
		out.Err = "No id specified."
		return errors.New("No id specified.")
	}

	p, err := plan.Get(actx, id)
	if err != nil {
		log.Logf("Get plan err:%s.", err)
		return err
	}

	out.Plan = planModel2Resp(p)

	//For debug -- begin
	jsons, errs := json.Marshal(out)
	if errs != nil {
		log.Logf(errs.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons)
	}
	//For debug -- end
	return err
}

func (b *dataflowService) ListPlan(ctx context.Context, in *pb.ListPlanRequest, out *pb.ListPlanResponse) error {
	log.Log("Get plans is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	plans, err := plan.List(actx)
	if err != nil {
		log.Logf("Get plans err:%s.", out.Err)
		return err
	}

	for _, p := range plans {
		out.Plans = append(out.Plans, planModel2Resp(&p))
	}

	//For debug -- begin
	jsons, errs := json.Marshal(out)
	if errs != nil {
		log.Logf(errs.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons)
	}
	//For debug -- end

	return err
}

func fillReqConnector(out *model.Connector, in *pb.Connector) error {
	switch in.StorType {
	case model.STOR_TYPE_OPENSDS:
		out.BucketName = in.BucketName
		return nil
	default:
		log.Logf("Not support connector type:%v\n", in.StorType)
		return errors.New("Invalid connector type.")
	}
}

func (b *dataflowService) CreatePlan(ctx context.Context, in *pb.CreatePlanRequest, out *pb.CreatePlanResponse) error {
	log.Log("Create plan is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	pl := model.Plan{}
	pl.Name = in.Plan.GetName()

	pl.Description = in.Plan.GetDescription()
	pl.Type = in.Plan.GetType()
	pl.OverWrite = in.Plan.GetOverWrite()
	pl.RemainSource = in.Plan.GetRemainSource()
	pl.PolicyId = in.Plan.GetPolicyId()
	pl.PolicyEnabled = in.Plan.GetPolicyEnabled()

	if in.Plan.GetSourceConn() != nil {
		srcConn := model.Connector{StorType: in.Plan.SourceConn.StorType}
		err := fillReqConnector(&srcConn, in.Plan.SourceConn)
		if err == nil {
			pl.SourceConn = srcConn
		} else {
			return err
		}
	} else {
		out.Err = "Get source connector failed."
		return errors.New("Invalid source connector.")
	}
	if in.Plan.GetDestConn() != nil {
		destConn := model.Connector{StorType: in.Plan.DestConn.StorType}
		err := fillReqConnector(&destConn, in.Plan.DestConn)
		if err == nil {
			pl.DestConn = destConn
		} else {
			out.Err = err.Error()
			return err
		}
	} else {
		out.Err = "Get destination connector failed."
		return errors.New("Invalid destination connector.")
	}
	if in.Plan.GetFilter() != nil {
		if in.Plan.Filter.Prefix != "" {
			pl.Filter = model.Filter{Prefix: in.Plan.Filter.Prefix}
		}
		if len(in.Plan.Filter.Tag) > 0 {
			for j := 0; j < len(in.Plan.Filter.Tag); j++ {
				pl.Filter.Tag = append(pl.Filter.Tag, model.KeyValue{Key: in.Plan.Filter.Tag[j].Key, Value: in.Plan.Filter.Tag[j].Value})
			}
		}
	} else {
		pl.Filter = model.Filter{Prefix: "/"} //this is default
	}

	if pl.Name == "" || pl.Type == "" {
		out.Err = "Name or type is null."
		return errors.New("Name or type is null.")
	}

	p, err := plan.Create(actx, &pl, b.datamoverClient)
	if err != nil {
		log.Logf("Create plan failed, err", err)
		return err
	}

	out.Plan = planModel2Resp(p)
	return nil
}

func (b *dataflowService) DeletePlan(ctx context.Context, in *pb.DeletePlanRequest, out *pb.DeletePlanResponse) error {
	log.Log("Delete plan is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())

	id := in.GetId()
	if id == "" {
		out.Err = "Get id failed."
		return errors.New("Get id failed.")
	}

	err := plan.Delete(actx, id)
	if err == nil {
		out.Err = ""
	} else {
		out.Err = err.Error()
	}
	log.Logf("Delete plan err:%s.", out.Err)

	return err
}

func (b *dataflowService) UpdatePlan(ctx context.Context, in *pb.UpdatePlanRequest, out *pb.UpdatePlanResponse) error {
	log.Log("Update plan is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())

	if in.GetPlanId() == "" {
		return errors.New("No id provided.")
	}

	updateMap := map[string]interface{}{}
	if err := json.Unmarshal([]byte(in.GetBody()), &updateMap); err != nil {
		return err
	}

	p, err := plan.Update(actx, in.GetPlanId(), updateMap, b.datamoverClient)
	if err != nil {
		log.Logf("Update plan finished, err:%s.", err)
		return err
	}

	out.Plan = planModel2Resp(p)
	return nil
}

func (b *dataflowService) RunPlan(ctx context.Context, in *pb.RunPlanRequest, out *pb.RunPlanResponse) error {
	log.Log("Run plan is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())

	id := in.Id
	jid, err := plan.Run(actx, id, b.datamoverClient)
	if err == nil {
		out.JobId = string(jid.Hex())
		out.Err = ""
	} else {
		out.JobId = ""
		out.Err = err.Error()
	}
	log.Logf("Run plan err:%d.", out.Err)
	return err
}

func (b *dataflowService) GetJob(ctx context.Context, in *pb.GetJobRequest, out *pb.GetJobResponse) error {
	log.Log("Get job is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	id := in.Id
	if in.Id == "all" {
		id = ""
	}

	jb, err := job.Get(actx, id)

	if err != nil {
		log.Logf("Get job err:%d.", err)
	}
	out.Job = &pb.Job{Id: string(jb.Id.Hex()), Type: jb.Type, PlanName: jb.PlanName, PlanId: jb.PlanId,
		Description: "for test", SourceLocation: jb.SourceLocation, DestLocation: jb.DestLocation,
		CreateTime: jb.CreateTime.Unix(), EndTime: jb.EndTime.Unix()}

	//For debug -- begin
	jsons, errs := json.Marshal(out)
	if errs != nil {
		log.Logf(errs.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons)
	}
	//For debug -- end
	return err
}

func (b *dataflowService) ListJob(ctx context.Context, in *pb.ListJobRequest, out *pb.ListJobResponse) error {
	log.Log("Get job is called in dataflow service.")
	actx := c.NewContextFromJson(in.GetContext())
	jobs, err := job.List(actx)
	if err != nil {
		log.Logf("Get job err:%d.", out.Err)
		return err
	}

	if err == nil {
		for i := 0; i < len(jobs); i++ {
			//TODO: need change according to real scenario
			des := "for test"
			j := pb.Job{Id: string(jobs[i].Id.Hex()), Type: jobs[i].Type, PlanName: jobs[i].PlanName, PlanId: jobs[i].PlanId,
				Description: des, SourceLocation: jobs[i].SourceLocation, DestLocation: jobs[i].DestLocation,
				CreateTime: jobs[i].CreateTime.Unix(), EndTime: jobs[i].EndTime.Unix()}
			out.Jobs = append(out.Jobs, &j)
		}
	}

	//For debug -- begin
	jsons, errs := json.Marshal(out)
	if errs != nil {
		log.Logf(errs.Error())
	} else {
		log.Logf("jsons1: %s.\n", jsons)
	}
	//For debug -- end
	return err
}
