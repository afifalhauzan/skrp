import type { Request, Response } from "express";
import type { ProgressService } from "../services/progressService";
import {
  artifactKindParam,
  caseIdParam,
  saveArtifactBody,
  saveCaseProgressBody,
  saveCodeRevisionBody,
  studentCodeParam,
} from "../validators";

export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  getSnapshot = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    res.json({ data: await this.service.getSnapshot(code) });
  };

  saveCaseProgress = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const caseId = caseIdParam.parse(req.params.caseId);
    const body = saveCaseProgressBody.parse(req.body);
    res.json({ data: await this.service.saveCaseProgress(code, caseId, body) });
  };

  saveArtifact = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const caseId = caseIdParam.parse(req.params.caseId);
    const kind = artifactKindParam.parse(req.params.kind);
    const { content } = saveArtifactBody.parse(req.body);
    res.json({
      data: await this.service.saveArtifact(code, caseId, kind, content),
    });
  };

  saveCodeRevision = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    const caseId = caseIdParam.parse(req.params.caseId);
    const body = saveCodeRevisionBody.parse(req.body);
    const result = await this.service.saveCodeRevision(code, caseId, body);
    res.status(result.created ? 201 : 200).json({ data: result });
  };
}
