package org.mozilla.labs.soup.<%= packageName %>;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.List;
import android.net.Uri;

public class MainActivity extends Activity
{

	static final String WEBAPP_ORIGIN = "<%= origin %>";

	static final String WEBAPP_URL = "<%= url %>";

	/** Called when the activity is first created. */
	@Override
	public void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);

		Intent redirect = null;

		String[] geckoPackages = {
			"org.mozilla.firefox",
			"org.mozilla.firefox_beta",
			"org.mozilla.fennec_aurora",
			"org.mozilla.fennec"
		};

		for (String name: geckoPackages) {
			redirect = new Intent("org.mozilla.gecko.WEBAPP");
			redirect.setClassName(name, "App");
			redirect.putExtra("args", "--webapp=" + WEBAPP_URL);

			if (isIntentActionAvailable(redirect)) {
				break;
			}

			redirect = null;
		}

		// See GeckoApp.ACTION_WEBAPP
		// Intent redirect = new Intent("org.mozilla.gecko.WEBAPP");
		// shortcutintent.setClass(this, "App");
		// shortcutintent.putExtra("args", "--webapp=" + uri);

		if (redirect == null) {
			redirect = new Intent(Intent.ACTION_VIEW);
			redirect.setData(Uri.parse(WEBAPP_URL));
		}

		startActivity(redirect);
	}

	private boolean isIntentActionAvailable(final Intent intent)
	{
		final PackageManager packageManager = getPackageManager();

		List<ResolveInfo> list =
			packageManager.queryIntentActivities(intent,
			PackageManager.MATCH_DEFAULT_ONLY);

		return list.size() > 0;
	}
}
