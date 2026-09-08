from pathlib import Path

# Remove the now-unused type left behind by deleting the numeric UI adapter.
path = Path("src/lib/session.ts")
text = path.read_text()
text = text.replace("  GeneratedQuestion,\n", "")
path.write_text(text)

# Keep the legacy no-argument submit callback for NumberPad/old controls, while
# exposing an explicit session submitter only to the semantic structured UI.
path = Path("src/app/page.tsx")
text = path.read_text()
old = '''  const submit = (sessionOverride?: TrainingSession) => {\n    const activeSession = sessionOverride ?? session;\n    if (!activeSession) return;\n    const activeQuestion = activeSession.questions[activeSession.currentIndex];'''
new = '''  const submitSession = (activeSession: TrainingSession) => {\n    const activeQuestion = activeSession.questions[activeSession.currentIndex];'''
assert old in text, "patched submitSession prefix not found"
text = text.replace(old, new, 1)
old = '''    setScratch(false);\n  };\n  const restartTraining = async () => {'''
new = '''    setScratch(false);\n  };\n  const submit = () => {\n    if (!session) return;\n    submitSession(session);\n  };\n  const restartTraining = async () => {'''
assert old in text, "submit wrapper insertion point not found"
text = text.replace(old, new, 1)
old = '''              onRestart={restartTraining}\n              onSubmit={submit}\n              session={session}'''
new = '''              onRestart={restartTraining}\n              onSubmit={submitSession}\n              session={session}'''
assert old in text, "structured semantic submit prop not found"
text = text.replace(old, new, 1)
path.write_text(text)

# Make the semantic component contract explicit: it always submits a concrete
# TrainingSession. Percent blocks remain editable until the confirmation button.
path = Path("src/components/StructuredSingleAnswerTraining.tsx")
text = path.read_text()
old = '  onSubmit: (sessionOverride?: TrainingSession) => void;'
new = '  onSubmit: (session: TrainingSession) => void;'
assert old in text, "structured semantic submit type not found"
text = text.replace(old, new, 1)
old = '            onClick={() => onSubmit()}'
new = '            onClick={() => onSubmit(session)}'
assert old in text, "percent block confirmation callback not found"
path.write_text(text.replace(old, new, 1))

# Retire the last test that intentionally expected the deleted numeric adapter.
path = Path("src/lib/training.test.ts")
text = path.read_text()
old = '''  it("grades a batch-4 semantic choice after its temporary numeric UI encoding", () => {\n    const drill = createTrainingSession({\n      userId: "fish",\n      questionType: "skill_drill",\n      subtype: "skill:B-R-05:L2",\n      questionCount: 10,\n      generationContext: deterministicContext(),\n    });\n    const current = drill.questions[0];\n    const answered = {\n      ...drill,\n      questions: [current],\n      questionCount: 1,\n      currentAnswer: current.answer,\n    };\n\n    const completed = submitCurrentAnswer(answered, 1_500, false, 2_000);\n    expect(completed.status).toBe("completed");\n    expect(completed.records[0]).toMatchObject({\n      isCorrect: true,\n      accuracyLevel: "exact",\n      userAnswer: current.answer,\n    });\n    expect(completed.records[0].question.generatorParams).toMatchObject({\n      semanticInputKind: "choice",\n      uiAdapter: "choice_numeric_code_v1",\n    });\n  });'''
new = '''  it("grades a batch-4 semantic choice directly without a numeric UI adapter", () => {\n    const drill = createTrainingSession({\n      userId: "fish",\n      questionType: "skill_drill",\n      subtype: "skill:B-R-05:L2",\n      questionCount: 10,\n      generationContext: deterministicContext(),\n    });\n    const current = drill.questions[0];\n    expect(current.inputKind).toBe("choice");\n    expect(current.generatorParams?.uiAdapter).toBeUndefined();\n    const answered = {\n      ...drill,\n      questions: [current],\n      questionCount: 1,\n      currentAnswer: current.answer,\n    };\n\n    const completed = submitCurrentAnswer(answered, 1_500, false, 2_000);\n    expect(completed.status).toBe("completed");\n    expect(completed.records[0]).toMatchObject({\n      isCorrect: true,\n      accuracyLevel: "exact",\n      userAnswer: current.answer,\n    });\n  });'''
assert old in text, "legacy semantic training test block not found"
path.write_text(text.replace(old, new, 1))
