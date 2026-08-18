import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Prints the exact geometry of vanilla entity models, as JSON.
 *
 * <p>Guessing at a Warden's proportions produces something that is not a
 * Warden, and no amount of texture work rescues it. The real numbers live in
 * the Minecraft jar - not as data files but as code, inside each model's
 * {@code createBodyLayer()} - so the only way to read them is to call that
 * method and walk what comes back.
 *
 * <p>The walk is done reflectively <em>by type</em> rather than by field name:
 * find the field whose type is a MeshDefinition, the Map that holds children,
 * the List that holds cubes. Mojang renames fields between versions and this
 * survives that; it only breaks if the shape of the class changes.
 *
 * <p>Run in CI, where the resolved Minecraft jar is on the classpath:
 * <pre>
 *   javac -cp "$MC_JAR" -d /tmp/oracle DumpModels.java
 *   java  -cp "$MC_JAR:/tmp/oracle" DumpModels net.minecraft...WardenModel ...
 * </pre>
 */
public final class DumpModels {

    public static void main(String[] args) {
        System.out.println("{\"models\":{");
        boolean first = true;
        for (String name : args) {
            String body;
            try {
                body = dumpClass(name);
            } catch (Throwable t) {
                body = "{\"error\":" + quote(t.getClass().getSimpleName() + ": " + t.getMessage()) + "}";
            }
            if (!first) System.out.println(",");
            first = false;
            System.out.print(quote(name) + ":" + body);
        }
        System.out.println("\n}}");
    }

    private static String dumpClass(String className) throws Exception {
        Class<?> cls = Class.forName(className);
        Object layer = null;
        Method chosen = null;
        List<String> tried = new ArrayList<>();
        // createBodyLayer() usually takes nothing; some take a deformation, a
        // size, or a boolean. Try every static method that returns a
        // LayerDefinition, and if none works say exactly why - a silent "no
        // factory" is the least useful thing this could report.
        for (Method m : cls.getDeclaredMethods()) {
            if (!Modifier.isStatic(m.getModifiers())) continue;
            if (!m.getReturnType().getSimpleName().equals("LayerDefinition")) continue;
            StringBuilder sig = new StringBuilder(m.getName() + "(");
            for (Class<?> pt : m.getParameterTypes()) sig.append(pt.getSimpleName()).append(",");
            sig.append(")");
            try {
                Object[] argv = new Object[m.getParameterCount()];
                for (int i = 0; i < argv.length; i++) argv[i] = defaultFor(m.getParameterTypes()[i]);
                m.setAccessible(true);
                layer = m.invoke(null, argv);
                chosen = m;
                break;
            } catch (Throwable t) {
                Throwable c = t.getCause() != null ? t.getCause() : t;
                tried.add(sig + " -> " + c.getClass().getSimpleName() + ": " + c.getMessage());
            }
        }
        if (layer == null) {
            // Some models keep their factory on a sibling class (a *Model
            // holding several layers, or a dedicated *Layers holder).
            return "{\"error\":" + quote("no usable LayerDefinition factory; tried "
                    + (tried.isEmpty() ? "nothing (no static LayerDefinition methods)"
                                       : String.join(" | ", tried))) + "}";
        }

        Object mesh = fieldOfType(layer, "MeshDefinition");
        Object rootPart = fieldOfType(mesh, "PartDefinition");
        StringBuilder sb = new StringBuilder();
        sb.append("{\"factory\":").append(quote(chosen.getName()));
        Object mat = fieldOfType(layer, "MaterialDefinition");
        if (mat != null) {
            List<Integer> tex = allInts(mat);
            sb.append(",\"texture\":").append(tex);
        }
        sb.append(",\"bones\":[");
        List<String> bones = new ArrayList<>();
        walk("root", rootPart, bones, new float[]{0, 0, 0});
        sb.append(String.join(",", bones));
        sb.append("]}");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void walk(String name, Object part, List<String> out, float[] parentAbs)
            throws Exception {
        float[] pose = poseOf(part);                       // x y z, xRot yRot zRot
        float[] abs = {parentAbs[0] + pose[0], parentAbs[1] + pose[1], parentAbs[2] + pose[2]};
        StringBuilder sb = new StringBuilder();
        sb.append("{\"name\":").append(quote(name));
        sb.append(",\"offset\":[").append(f(pose[0])).append(",").append(f(pose[1]))
          .append(",").append(f(pose[2])).append("]");
        sb.append(",\"abs\":[").append(f(abs[0])).append(",").append(f(abs[1]))
          .append(",").append(f(abs[2])).append("]");
        if (pose[3] != 0 || pose[4] != 0 || pose[5] != 0) {
            sb.append(",\"rot\":[").append(f(pose[3])).append(",").append(f(pose[4]))
              .append(",").append(f(pose[5])).append("]");
        }

        List<Object> cubes = (List<Object>) fieldOfRawType(part, List.class);
        if (cubes != null && !cubes.isEmpty()) {
            sb.append(",\"cubes\":[");
            List<String> cs = new ArrayList<>();
            for (Object cube : cubes) cs.add(dumpCube(cube));
            sb.append(String.join(",", cs)).append("]");
        }
        sb.append("}");
        out.add(sb.toString());

        Map<String, Object> children = (Map<String, Object>) fieldOfRawType(part, Map.class);
        if (children != null) {
            for (Map.Entry<String, Object> e : children.entrySet()) {
                walk(e.getKey(), e.getValue(), out, abs);
            }
        }
    }

    private static String dumpCube(Object cube) throws Exception {
        StringBuilder sb = new StringBuilder("{");
        List<String> bits = new ArrayList<>();
        for (Field f : cube.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            f.setAccessible(true);
            Object v = f.get(cube);
            if (v == null) continue;
            String tn = v.getClass().getSimpleName();
            if (tn.startsWith("Vector3f")) {
                bits.add(quote(f.getName()) + ":[" + f(fl(v, "x")) + "," + f(fl(v, "y"))
                        + "," + f(fl(v, "z")) + "]");
            } else if (v instanceof Number) {
                bits.add(quote(f.getName()) + ":" + f(((Number) v).floatValue()));
            } else if (v instanceof Boolean) {
                bits.add(quote(f.getName()) + ":" + v);
            } else if (v instanceof String) {
                bits.add(quote(f.getName()) + ":" + quote((String) v));
            }
        }
        return sb.append(String.join(",", bits)).append("}").toString();
    }

    private static float[] poseOf(Object part) throws Exception {
        Object pose = fieldOfType(part, "PartPose");
        float[] out = new float[6];
        if (pose == null) return out;
        String[] names = {"x", "y", "z", "xRot", "yRot", "zRot"};
        Field[] fs = pose.getClass().getDeclaredFields();
        List<Float> vals = new ArrayList<>();
        for (Field f : fs) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType() != float.class) continue;
            f.setAccessible(true);
            vals.add(f.getFloat(pose));
        }
        // Records keep declaration order, so the six floats arrive as
        // x, y, z, xRot, yRot, zRot.
        for (int i = 0; i < Math.min(6, vals.size()); i++) out[i] = vals.get(i);
        for (int i = 0; i < names.length; i++) {
            try {
                Field f = pose.getClass().getDeclaredField(names[i]);
                f.setAccessible(true);
                out[i] = f.getFloat(pose);
            } catch (NoSuchFieldException ignored) {
            }
        }
        return out;
    }

    private static float fl(Object vec, String name) throws Exception {
        try {
            Field f = vec.getClass().getField(name);
            return f.getFloat(vec);
        } catch (NoSuchFieldException e) {
            Method m = vec.getClass().getMethod(name);
            return ((Number) m.invoke(vec)).floatValue();
        }
    }

    private static Object fieldOfType(Object owner, String simpleTypeName) throws Exception {
        if (owner == null) return null;
        for (Field f : owner.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType().getSimpleName().equals(simpleTypeName)) {
                f.setAccessible(true);
                return f.get(owner);
            }
        }
        return null;
    }

    private static Object fieldOfRawType(Object owner, Class<?> raw) throws Exception {
        for (Field f : owner.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            if (raw.isAssignableFrom(f.getType())) {
                f.setAccessible(true);
                return f.get(owner);
            }
        }
        return null;
    }

    private static List<Integer> allInts(Object owner) throws Exception {
        List<Integer> out = new ArrayList<>();
        for (Field f : owner.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) continue;
            if (f.getType() == int.class) {
                f.setAccessible(true);
                out.add(f.getInt(owner));
            }
        }
        return out;
    }

    private static Object defaultFor(Class<?> t) throws Exception {
        if (t == float.class) return 0.0f;
        if (t == int.class) return 0;
        if (t == boolean.class) return false;
        if (t.getSimpleName().equals("CubeDeformation")) {
            for (Field f : t.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) && t.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    return f.get(null);
                }
            }
            return t.getDeclaredConstructor(float.class).newInstance(0.0f);
        }
        return null;
    }

    private static String f(float v) {
        if (v == Math.rint(v)) return String.valueOf((int) v);
        return String.valueOf(Math.round(v * 1000f) / 1000f);
    }

    private static String quote(String s) {
        return "\"" + (s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"")) + "\"";
    }
}
