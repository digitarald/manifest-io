package org.mozilla.labs.soup.<%= packageName %>;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.List;
import android.net.Uri;
import android.util.Log;
import android.widget.Toast;

public class MainActivity extends Activity
{
	private static final String TAG = MainActivity.class.getSimpleName();

	static final String WEBAPP_ORIGIN = "<%= origin %>";

	static final String WEBAPP_URL = "<%= url %>";

	/** Called when the activity is first created. */
	@Override
	public void onCreate(Bundle savedInstanceState)
	{
		super.onCreate(savedInstanceState);

		Intent redirect = null;

		String[] geckoPackages = {
			"org.mozilla.fennec",
			"org.mozilla.fennec_aurora",
			"org.mozilla.firefox_beta",
			"org.mozilla.firefox"
		};

		for (String uri: geckoPackages) {

			if (!isAppAvailable(uri)) {
				Log.d(TAG, "App not installed " + uri);

				redirect = null;
				continue;
			}

			Log.d(TAG, "Found app using " + uri);

			PackageManager pm = getPackageManager();
			redirect = pm.getLaunchIntentForPackage(uri);

			// redirect.setAction("org.mozilla.gecko.WEBAPP");
			redirect.setAction(Intent.ACTION_VIEW);

			redirect.setData(Uri.parse(WEBAPP_URL));
			// redirect.putExtra("args", "--url=" + WEBAPP_URL);

			break;
		}

		if (redirect == null) {
			Log.d(TAG, "Falling back to Intent.ACTION_VIEW");

			Toast.makeText(this, "Install Firefox Mobile for best app integration!", Toast.LENGTH_LONG).show();

			redirect = new Intent(Intent.ACTION_VIEW);
			redirect.setData(Uri.parse(WEBAPP_URL));
		}

		// Force new tab if URL is not open yet (TODO: To be verified)
		redirect.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

		startActivity(redirect);

		finish();
	}

	// private boolean isIntentActionAvailable(final Intent intent)
	// {
	//	final PackageManager packageManager = getPackageManager();

	//	List<ResolveInfo> list =
	//		packageManager.queryIntentActivities(intent,
	//		PackageManager.MATCH_DEFAULT_ONLY);

	//	return list.size() > 0;
	// }

	private boolean isAppAvailable(String uri)
	{
		final PackageManager packageManager = getPackageManager();

		boolean installed = false;
		try {
			packageManager.getPackageInfo(uri, PackageManager.GET_ACTIVITIES);
			installed = true;
		} catch (PackageManager.NameNotFoundException e) {
			installed = false;
		}

		return installed;
	}
}
