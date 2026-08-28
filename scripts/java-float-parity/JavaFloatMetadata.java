import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import javax.tools.*;
import com.sun.source.tree.*;
import com.sun.source.util.*;

public final class JavaFloatMetadata {
    private static String q(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\' -> b.append("\\\\");
                case '"' -> b.append("\\\"");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (c < 0x20) b.append(String.format("\\u%04x", (int)c));
                    else b.append(c);
                }
            }
        }
        return b.append('"').toString();
    }
    private static String array(Collection<String> values) { return "[" + String.join(",", values) + "]"; }
    private static boolean isFloatType(String type) {
        if (type == null) return false;
        String t = type.replace(" ", "");
        return t.equals("float") || t.equals("float[]") || t.startsWith("float[");
    }

    public static void main(String[] args) throws Exception {
        Path root = Paths.get(args[0]).toAbsolutePath();
        List<File> files = new ArrayList<>();
        try (var stream = Files.walk(root)) {
            stream.filter(path -> path.toString().endsWith(".java")).sorted().forEach(path -> files.add(path.toFile()));
        }
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        StandardJavaFileManager fm = compiler.getStandardFileManager(null, Locale.ROOT, StandardCharsets.UTF_8);
        JavacTask task = (JavacTask)compiler.getTask(null, fm, null, List.of("-proc:none"), null, fm.getJavaFileObjectsFromFiles(files));
        List<CompilationUnitTree> units = new ArrayList<>();
        task.parse().forEach(units::add);
        Trees trees = Trees.instance(task);
        SourcePositions positions = trees.getSourcePositions();

        for (CompilationUnitTree unit : units) {
            Path file = Paths.get(unit.getSourceFile().toUri()).toAbsolutePath();
            String source = Files.readString(file);
            new TreePathScanner<Void,String>() {
                @Override public Void visitClass(ClassTree node, String parentName) {
                    String simple = node.getSimpleName().toString();
                    if (simple.isEmpty()) return super.visitClass(node,parentName);
                    String full = parentName == null || parentName.isEmpty() ? simple : parentName + "$" + simple;
                    List<String> fields = new ArrayList<>();
                    List<String> methods = new ArrayList<>();
                    Map<String,Integer> overloads = new HashMap<>();
                    int staticBlockIndex = 0;
                    for (Tree member : node.getMembers()) {
                        if (member instanceof VariableTree field) {
                            String type = field.getType()==null?null:field.getType().toString();
                            List<String> fieldLiterals = new ArrayList<>();
                            if (field.getInitializer() != null) {
                                new TreeScanner<Void,Void>() {
                                    @Override public Void visitLiteral(LiteralTree literal, Void unused) {
                                        Object value=literal.getValue();
                                        if (value instanceof Number || value instanceof Character) {
                                            long start=positions.getStartPosition(unit,literal), end=positions.getEndPosition(unit,literal);
                                            String raw = start>=0 && end>=start && end<=source.length()?source.substring((int)start,(int)end):literal.toString();
                                            boolean floatLiteral=raw.matches("(?is).*?[f]\\s*$");
                                            fieldLiterals.add("{"+"\"raw\":"+q(raw)+",\"float\":"+floatLiteral+",\"start\":"+start+"}");
                                        }
                                        return super.visitLiteral(literal,unused);
                                    }
                                }.scan(field.getInitializer(),null);
                            }
                            fields.add("{"+
                                "\"name\":"+q(field.getName().toString())+","+
                                "\"type\":"+q(type)+","+
                                "\"float\":"+isFloatType(type)+","+
                                "\"static\":"+field.getModifiers().getFlags().contains(javax.lang.model.element.Modifier.STATIC)+","+
                                "\"literals\":"+array(fieldLiterals)+
                                "}");
                        } else if (member instanceof MethodTree method) {
                            String logical = method.getReturnType()==null?"<init>":method.getName().toString();
                            int overload = overloads.getOrDefault(logical,0); overloads.put(logical,overload+1);
                            methods.add(methodRecord(method.getBody(), logical, overload,
                                method.getReturnType()==null?null:method.getReturnType().toString(), method.getParameters(), unit, positions, source));
                        } else if (member instanceof BlockTree block && block.isStatic()) {
                            methods.add(methodRecord(block, "<static>", staticBlockIndex++, null, List.of(), unit, positions, source));
                        }
                    }
                    String parent = node.getExtendsClause()==null?null:node.getExtendsClause().toString();
                    System.out.println("{"+
                        "\"file\":"+q(root.relativize(file).toString().replace(File.separatorChar,'/'))+","+
                        "\"name\":"+q(simple)+","+
                        "\"fullName\":"+q(full)+","+
                        "\"parent\":"+q(parent)+","+
                        "\"fields\":"+array(fields)+","+
                        "\"methods\":"+array(methods)+
                        "}");
                    return super.visitClass(node,full);
                }

                private String methodRecord(Tree body, String name, int overload, String returnType,
                        List<? extends VariableTree> parameters, CompilationUnitTree unit,
                        SourcePositions positions, String source) {
                    List<String> params = new ArrayList<>();
                    for (VariableTree p : parameters) {
                        String type=p.getType().toString();
                        params.add("{"+"\"name\":"+q(p.getName().toString())+",\"type\":"+q(type)+",\"float\":"+isFloatType(type)+"}");
                    }
                    List<String> locals = new ArrayList<>();
                    List<String> literals = new ArrayList<>();
                    if (body != null) {
                        new TreeScanner<Void,Void>() {
                            @Override public Void visitClass(ClassTree nested, Void unused) { return null; }
                            @Override public Void visitVariable(VariableTree v, Void unused) {
                                String type=v.getType()==null?null:v.getType().toString();
                                if (type != null) {
                                    long start=positions.getStartPosition(unit,v);
                                    locals.add("{"+"\"name\":"+q(v.getName().toString())+",\"type\":"+q(type)+",\"float\":"+isFloatType(type)+",\"start\":"+start+"}");
                                }
                                return super.visitVariable(v,unused);
                            }
                            @Override public Void visitLiteral(LiteralTree literal, Void unused) {
                                Object value=literal.getValue();
                                if (value instanceof Number || value instanceof Character) {
                                    long start=positions.getStartPosition(unit,literal), end=positions.getEndPosition(unit,literal);
                                    String raw = start>=0 && end>=start && end<=source.length()?source.substring((int)start,(int)end):literal.toString();
                                    boolean floatLiteral=raw.matches("(?is).*?[f]\\s*$");
                                    literals.add("{"+"\"raw\":"+q(raw)+",\"float\":"+floatLiteral+",\"start\":"+start+"}");
                                }
                                return super.visitLiteral(literal,unused);
                            }
                        }.scan(body,null);
                    }
                    return "{"+
                        "\"name\":"+q(name)+","+
                        "\"overloadIndex\":"+overload+","+
                        "\"returnType\":"+q(returnType)+","+
                        "\"floatReturn\":"+isFloatType(returnType)+","+
                        "\"params\":"+array(params)+","+
                        "\"locals\":"+array(locals)+","+
                        "\"literals\":"+array(literals)+
                        "}";
                }
            }.scan(unit,null);
        }
        fm.close();
    }
}
