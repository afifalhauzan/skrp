import type { Request, Response } from "express";
import { CASES } from "../config/cases";
import type { AssistanceService } from "../services/assistanceService";
import type { CaseEvaluationService } from "../services/caseEvaluationService";
import type { EvaluationService } from "../services/evaluationService";
import {
  caseEvaluationBody,
  evaluationIdParam,
  hintRequestBody,
  stageListQuery,
  stageQuery,
  studentCodeParam,
  submitStageEvaluationBody,
} from "../validators";

export class AiController {
  constructor(
    private readonly evaluations: EvaluationService,
    private readonly assistance: AssistanceService,
    private readonly cases: CaseEvaluationService,
  ) {}

  /** Backend-owned case catalogue (ids, support level, rules); no secrets or answers. */
  listCases = (_req: Request, res: Response) => {
    res.json({
      data: CASES.map((c) => ({
        id: c.id,
        number: c.number,
        support: c.support,
        title: c.title,
      })),
    });
  };

  submitStage = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const body = submitStageEvaluationBody.parse(req.body);
    const result = await this.evaluations.submit(code, body, req.log as never);
    res.status(result.created ? 201 : 200).json({ data: result });
  };

  getStage = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const id = evaluationIdParam.parse(req.params.evaluationId);
    res.json({ data: await this.evaluations.get(code, id) });
  };

  listStage = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const { caseId, stage } = stageListQuery.parse(req.query);
    res.json({ data: await this.evaluations.list(code, caseId, stage) });
  };

  hint = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const body = hintRequestBody.parse(req.body);
    const result = await this.assistance.requestHint(
      code,
      body,
      req.log as never,
    );
    res.status(result.created ? 201 : 200).json({ data: result });
  };

  history = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const { caseId, stage } = stageQuery.parse(req.query);
    res.json({ data: await this.assistance.history(code, caseId, stage) });
  };

  evaluateCase = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const { caseId } = caseEvaluationBody.parse(req.body);
    res.json({ data: await this.cases.evaluateCase(code, caseId) });
  };
}
